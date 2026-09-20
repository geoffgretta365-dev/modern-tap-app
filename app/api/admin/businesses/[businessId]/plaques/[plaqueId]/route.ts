import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ businessId: string; plaqueId: string }> }
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
  const values = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const name = values.name;
  const destination = values.destination_url;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100 ||
      typeof destination !== "string" || !destination.trim()) {
    return NextResponse.json({ error: "Provide a plaque name (1–100 characters) and destination URL." }, { status: 400 });
  }
  const normalizedUrl = /^https?:\/\//i.test(destination.trim())
    ? destination.trim() : `https://${destination.trim()}`;
  try {
    const url = new URL(normalizedUrl);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid protocol");
  } catch {
    return NextResponse.json({ error: "Enter a valid HTTP or HTTPS destination URL." }, { status: 400 });
  }

  const { businessId, plaqueId } = await params;
  const admin = createAdminClient();
  const { data: business, error: businessError } = await admin
    .from("businesses").select("id").eq("id", businessId).maybeSingle();
  if (businessError) return NextResponse.json({ error: "Business lookup failed" }, { status: 500 });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data: plaque, error: plaqueError } = await admin
    .from("plaques").select("id").eq("id", plaqueId).eq("business_id", businessId).maybeSingle();
  if (plaqueError) return NextResponse.json({ error: "Plaque lookup failed" }, { status: 500 });
  if (!plaque) return NextResponse.json({ error: "Plaque not found for this business" }, { status: 404 });

  const { data: updated, error } = await admin
    .from("plaques").update({ name: name.trim(), destination_url: normalizedUrl })
    .eq("id", plaqueId).eq("business_id", businessId).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Plaque update failed" }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Plaque not found for this business" }, { status: 404 });
  return NextResponse.json({ success: true });
}
