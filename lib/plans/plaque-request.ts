import "server-only";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { capacityMessage, readPlaqueEntitlement } from "./plaque-entitlement";

export async function plaqueOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Sign in to manage plaques." }, { status: 401 }) };
  const { data: business, error } = await supabase.from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  if (error || !business) return { response: NextResponse.json({ error: "Business not found." }, { status: 404 }) };
  return { supabase, business };
}
export async function plaqueMutationError(error: { message: string }, businessId: string) {
  if (/MT_PLAQUE_LIMIT|MT_ENTITLEMENT_UNCONFIGURED|MT_SUBSCRIPTION_REQUIRED/.test(error.message)) {
    return NextResponse.json({ error: capacityMessage(await readPlaqueEntitlement(businessId)) }, { status: 409 });
  }
  return NextResponse.json({ error: "Could not save the plaque. Refresh and try again." }, { status: 500 });
}
