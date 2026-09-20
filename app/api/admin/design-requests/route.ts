import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDesignRequestStatus } from "@/lib/design-requests";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const adminIds = (process.env.MODERNTAP_ADMIN_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (!adminIds.includes(user.id)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  let body: { requestId?: unknown; status?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.requestId !== "string" || !uuid.test(body.requestId) || !isDesignRequestStatus(body.status)) {
    return NextResponse.json({ error: "Invalid design request update." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: saved, error } = await admin.from("design_change_requests")
    .update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", body.requestId)
    .select("id").maybeSingle();
  if (error || !saved) return NextResponse.json({ error: "Could not update design request." }, { status: 500 });
  return NextResponse.json({ success: true });
}
