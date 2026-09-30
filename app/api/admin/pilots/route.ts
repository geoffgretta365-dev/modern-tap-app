import { NextResponse } from "next/server";
import { adminDenied } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { pilotInput } from "@/lib/pilot-input";

export async function POST(request: Request) {
  const denied = await adminDenied();
  if (denied) return denied;
  let values;
  try { values = pilotInput(await request.json()); }
  catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request." }, { status: 400 });
  }
  const { data, error } = await createAdminClient().from("businesses")
    .insert(values).select("id").single();
  if (error) return NextResponse.json({ error: "Could not create pilot. Verify the admin pilot migration is installed." }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
