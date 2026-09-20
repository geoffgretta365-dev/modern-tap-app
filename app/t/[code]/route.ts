import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createAdminClient();

  // Find the plaque using its unique code
  const { data: plaque, error } = await supabase
    .from("plaques")
    .select("id, destination_url")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Public plaque lookup failed", { code: error.code });
    return new NextResponse("Unable to load plaque", { status: 500 });
  }

  if (!plaque) {
    return new NextResponse("Plaque not found", { status: 404 });
  }

  // Record this tap
  const { error: tapError } = await supabase.from("tap_events").insert({
    plaque_id: plaque.id,
    user_agent: request.headers.get("user-agent"),
  });
  if (tapError) {
    console.error("Public plaque tap insert failed", { code: tapError.code });
  }

  // Send customer to the plaque's real destination
  return NextResponse.redirect(plaque.destination_url);
}
