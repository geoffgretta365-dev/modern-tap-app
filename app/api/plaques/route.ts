import { plaqueEntitlementsEnabled } from "@/lib/plans/entitlements-enabled";
import { NextResponse } from "next/server";
import { plaqueOwner, plaqueMutationError } from "@/lib/plans/plaque-request";
import { canAddPlaque, capacityMessage, readPlaqueEntitlement } from "@/lib/plans/plaque-entitlement";

export async function POST(request: Request) {
  const owner = await plaqueOwner();
  if (owner.response) return owner.response;
  let input;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!input || typeof input.name !== "string" || !input.name.trim() || input.name.length > 200
    || typeof input.destination !== "string" || input.destination.length > 2048
    || !["general", "review"].includes(input.purpose)
    || Object.keys(input).some(key => !["name", "destination", "purpose"].includes(key))) {
    return NextResponse.json({ error: "Enter a name, valid website, and plaque purpose." }, { status: 400 });
  }
  let url: URL;
  try { url = new URL(input.destination); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error(); }
  catch { return NextResponse.json({ error: "Enter an http or https destination." }, { status: 400 }); }
  if (plaqueEntitlementsEnabled()) {
    const entitlement = await readPlaqueEntitlement(owner.business.id);
    if (!canAddPlaque(entitlement)) return NextResponse.json({ error: capacityMessage(entitlement) }, { status: 409 });
  }
  // UX precheck above is not the security boundary. The DB trigger atomically enforces capacity.
  const { data, error } = await owner.supabase.from("plaques").insert({
    business_id: owner.business.id, name: input.name.trim(), code: crypto.randomUUID().replaceAll("-", "").toUpperCase(),
    destination_url: url.toString(), purpose: input.purpose, active: true,
  }).select("id").single();
  if (error) return plaqueMutationError(error, owner.business.id);
  return NextResponse.json({ id: data.id }, { status: 201 });
}
