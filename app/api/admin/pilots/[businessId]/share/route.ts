import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { adminDenied } from "@/lib/admin-access";
import { authOrigin } from "@/lib/auth-redirects";
import { createAdminClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ businessId: string }> };
const missing = () => NextResponse.json({ error: "Pilot business not found." }, { status: 404 });

export async function POST(_request: Request, { params }: Context) {
  const denied = await adminDenied();
  if (denied) return denied;
  const { businessId } = await params;
  const admin = createAdminClient();
  // Set only when absent, so repeated/concurrent Create requests retain the same link.
  const { error } = await admin.from("businesses").update({ pilot_share_token: randomBytes(32).toString("base64url") })
    .eq("id", businessId).eq("is_pilot", true).is("pilot_share_token", null);
  if (error) return NextResponse.json({ error: "Could not create share link." }, { status: 500 });
  const { data, error: lookupError } = await admin.from("businesses").select("pilot_share_token")
    .eq("id", businessId).eq("is_pilot", true).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Could not load share link." }, { status: 500 });
  if (!data) return missing();
  if (!data.pilot_share_token) return NextResponse.json({ error: "Link was turned off. Try again to create a new link." }, { status: 409 });
  return NextResponse.json({ url: `${authOrigin()}/r/${data.pilot_share_token}` }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await adminDenied();
  if (denied) return denied;
  const { businessId } = await params;
  const { data, error } = await createAdminClient().from("businesses").update({ pilot_share_token: null })
    .eq("id", businessId).eq("is_pilot", true).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not turn off share link." }, { status: 500 });
  if (!data) return missing();
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
