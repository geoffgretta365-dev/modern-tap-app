import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid plaque." }, { status: 400 });
  let body: { purpose?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (body.purpose !== "general" && body.purpose !== "review") {
    return NextResponse.json({ error: "Choose General or Review Card." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { data: business, error: businessError } = await supabase.from("businesses")
    .select("id").eq("owner_id", user.id).maybeSingle();
  if (businessError) return NextResponse.json({ error: "Could not verify ownership." }, { status: 500 });
  if (!business) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { data: plaque, error: plaqueError } = await supabase.from("plaques")
    .select("id").eq("id", id).eq("business_id", business.id).maybeSingle();
  if (plaqueError) return NextResponse.json({ error: "Could not verify plaque." }, { status: 500 });
  if (!plaque) return NextResponse.json({ error: "Plaque not found." }, { status: 404 });
  const { data: saved, error } = await supabase.from("plaques")
    .update({ purpose: body.purpose }).eq("id", id).eq("business_id", business.id)
    .select("id, purpose").maybeSingle();
  if (error || !saved) return NextResponse.json({ error: "Could not save plaque purpose." }, { status: 500 });
  return NextResponse.json({ purpose: saved.purpose });
}
