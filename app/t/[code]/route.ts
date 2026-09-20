import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createAdminClient();

  // Find the plaque using its unique code
  const { data: plaque, error } = await supabase
    .from("plaques")
    .select("id, mode, destination_url")
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

  if (plaque.mode === "smart_page") {
    return NextResponse.redirect(
      new URL(`/s/${encodeURIComponent(code)}`, request.url)
    );
  }

  const destination = safeHttpUrl(plaque.destination_url);
  if (!destination) {
    return new NextResponse("Plaque destination unavailable", { status: 503 });
  }

  // Direct Link plaques retain their existing redirect behavior.
  return NextResponse.redirect(destination);
}
