import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  // Find the plaque using its unique code
  const { data: plaque, error } = await supabase
    .from("plaques")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .single();

  if (error || !plaque) {
    return new NextResponse("Plaque not found", { status: 404 });
  }

  // Record this tap
  await supabase.from("tap_events").insert({
    plaque_id: plaque.id,
    user_agent: request.headers.get("user-agent"),
  });

  // Send customer to the plaque's real destination
  return NextResponse.redirect(plaque.destination_url);
}