import { NextResponse } from "next/server";
import { adminDenied } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { pilotPlaqueInput } from "@/lib/pilot-input";

export async function POST(request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const denied = await adminDenied();
  if (denied) return denied;
  const { businessId } = await params;
  const admin = createAdminClient();
  const { data: business, error: lookupError } = await admin.from("businesses")
    .select("id, is_pilot").eq("id", businessId).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Business lookup failed." }, { status: 500 });
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  if (business.is_pilot !== true) return NextResponse.json({ error: "Admin plaque creation is only available for pilot businesses." }, { status: 403 });
  let input;
  try { input = pilotPlaqueInput(await request.json()); }
  catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request." }, { status: 400 });
  }
  const rows = Array.from({ length: input.quantity }, (_, index) => ({
    business_id: business.id,
    name: input.quantity === 1 ? input.name : `${input.name} ${index + 1}`,
    placement: input.placement, destination_url: input.destination,
    code: crypto.randomUUID().replaceAll("-", "").toUpperCase(),
    mode: "direct_link", purpose: "review", active: true,
  }));
  // One batch insert is atomic: a constraint failure cannot leave a partial batch.
  const { data, error } = await admin.from("plaques").insert(rows).select("id, name, code");
  if (error) return NextResponse.json({ error: "Could not add plaques. No plaques in this batch were saved." }, { status: 500 });
  return NextResponse.json({ plaques: data }, { status: 201 });
}
