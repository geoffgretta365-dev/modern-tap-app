import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedStatuses = ["open", "in_progress", "resolved"];

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const adminUserIds = (process.env.MODERNTAP_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!adminUserIds.includes(user.id)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  let body: {
    ticketId?: string;
    status?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  if (
    !body.ticketId ||
    !body.status ||
    !allowedStatuses.includes(body.status)
  ) {
    return NextResponse.json(
      { error: "Invalid support ticket update" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({
      status: body.status,
      updated_at: new Date().toISOString(),
      resolved_at:
        body.status === "resolved"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", body.ticketId);

  if (error) {
    console.error("Support ticket update failed:", error);

    return NextResponse.json(
      { error: "Database update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}