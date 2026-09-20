import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedStatuses = [
  "requested",
  "approved",
  "shipped",
  "delivered",
];

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

  const adminUserIds = (
    process.env.MODERNTAP_ADMIN_USER_IDS ?? ""
  )
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
    requestId?: string;
    status?: string;
    trackingNumber?: string;
    trackingUrl?: string;
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
    !body.requestId ||
    !body.status ||
    !allowedStatuses.includes(body.status)
  ) {
    return NextResponse.json(
      { error: "Invalid replacement update" },
      { status: 400 }
    );
  }

  const trackingUrl = body.trackingUrl?.trim() || null;

  if (trackingUrl) {
    try {
      const url = new URL(trackingUrl);

      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid tracking URL" },
        { status: 400 }
      );
    }
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("replacement_requests")
    .update({
      status: body.status,
      tracking_number:
        body.trackingNumber?.trim() || null,
      tracking_url: trackingUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.requestId);

  if (error) {
    console.error("Replacement update failed:", error);

    return NextResponse.json(
      { error: "Database update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}