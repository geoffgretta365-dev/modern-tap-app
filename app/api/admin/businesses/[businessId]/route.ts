import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminUserIds = (process.env.MODERNTAP_ADMIN_USER_IDS ?? "")
    .split(",").map((id) => id.trim()).filter(Boolean);
  if (!adminUserIds.includes(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = typeof body === "object" && body !== null && "name" in body
    ? body.name : undefined;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    return NextResponse.json({ error: "Business name must be 1–100 characters." }, { status: 400 });
  }

  const { businessId } = await params;
  const admin = createAdminClient();
  const { data: business, error: lookupError } = await admin
    .from("businesses").select("id").eq("id", businessId).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Business lookup failed" }, { status: 500 });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data: updated, error } = await admin
    .from("businesses").update({ name: name.trim() })
    .eq("id", businessId).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Business update failed" }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
