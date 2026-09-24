import { plaqueEntitlementsEnabled } from "@/lib/plans/entitlements-enabled";
import { NextResponse } from "next/server";
import { plaqueOwner, plaqueMutationError } from "@/lib/plans/plaque-request";
import { canAddPlaque, capacityMessage, readPlaqueEntitlement } from "@/lib/plans/plaque-entitlement";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!plaqueEntitlementsEnabled()) return NextResponse.json({ error: "Plaque status changes are not enabled." }, { status: 404 });
  const owner = await plaqueOwner();
  if (owner.response) return owner.response;
  let input;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!input || typeof input.active !== "boolean" || Object.keys(input).length !== 1) return NextResponse.json({ error: "Send only an active status." }, { status: 400 });
  const { id } = await params;
  const { data: plaque, error: lookupError } = await owner.supabase.from("plaques").select("id, active").eq("id", id).eq("business_id", owner.business.id).maybeSingle();
  if (lookupError || !plaque) return NextResponse.json({ error: "Plaque not found." }, { status: 404 });
  if (input.active && !plaque.active) {
    const entitlement = await readPlaqueEntitlement(owner.business.id);
    if (!canAddPlaque(entitlement)) return NextResponse.json({ error: capacityMessage(entitlement) }, { status: 409 });
  }
  const { error } = await owner.supabase.from("plaques").update({ active: input.active }).eq("id", id).eq("business_id", owner.business.id);
  if (error) return plaqueMutationError(error, owner.business.id);
  return NextResponse.json({ active: input.active });
}
