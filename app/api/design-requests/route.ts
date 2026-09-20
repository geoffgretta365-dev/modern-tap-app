import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: { plaqueId?: unknown; notes?: unknown; inspirationUrl?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.plaqueId !== "string" || !uuid.test(body.plaqueId) ||
      typeof body.notes !== "string" || !body.notes.trim() || body.notes.trim().length > 2000 ||
      (body.inspirationUrl !== undefined && typeof body.inspirationUrl !== "string")) {
    return NextResponse.json({ error: "Select a plaque and enter up to 2,000 characters of instructions." }, { status: 400 });
  }
  const inspirationUrl = (body.inspirationUrl as string | undefined)?.trim() || null;
  if (inspirationUrl) {
    if (inspirationUrl.length > 2048) return NextResponse.json({ error: "Reference URL is too long." }, { status: 400 });
    try {
      const parsed = new URL(inspirationUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("protocol");
    } catch { return NextResponse.json({ error: "Enter an HTTP or HTTPS reference URL." }, { status: 400 }); }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { data: business, error: businessError } = await supabase.from("businesses")
    .select("id").eq("owner_id", user.id).maybeSingle();
  if (businessError) return NextResponse.json({ error: "Could not verify ownership." }, { status: 500 });
  if (!business) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { data: subscription, error: subscriptionError } = await supabase.from("subscriptions")
    .select("status").eq("business_id", business.id).maybeSingle();
  if (subscriptionError) return NextResponse.json({ error: "Could not verify subscription." }, { status: 500 });
  if (subscription?.status !== "active" && subscription?.status !== "trialing") {
    return NextResponse.json({ error: "An active subscription is required." }, { status: 403 });
  }
  const { data: plaque, error: plaqueError } = await supabase.from("plaques")
    .select("id").eq("id", body.plaqueId).eq("business_id", business.id).maybeSingle();
  if (plaqueError) return NextResponse.json({ error: "Could not verify plaque." }, { status: 500 });
  if (!plaque) return NextResponse.json({ error: "Plaque not found." }, { status: 404 });
  // Plan allowances are not defined yet. Add an entitlement check here when plans are finalized.
  const { error } = await supabase.from("design_change_requests").insert({
    business_id: business.id, plaque_id: plaque.id, notes: body.notes.trim(),
    inspiration_url: inspirationUrl,
  });
  if (error) return NextResponse.json({ error: "Could not submit design request." }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
