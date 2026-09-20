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

const unavailable = () => new NextResponse("Destination unavailable", { status: 503 });
const missing = () => new NextResponse("Button not found", { status: 404 });
const failed = () => new NextResponse("Unable to load button", { status: 500 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string; buttonId: string }> },
) {
  const { code, buttonId } = await params;
  const supabase = createAdminClient();

  const { data: plaque, error: plaqueError } = await supabase
    .from("plaques")
    .select("id")
    .eq("code", code)
    .eq("active", true)
    .eq("mode", "smart_page")
    .maybeSingle();
  if (plaqueError) {
    console.error("Smart Page click plaque lookup failed", { code: plaqueError.code });
    return failed();
  }
  if (!plaque) return missing();

  const { data: page, error: pageError } = await supabase
    .from("smart_pages")
    .select("id")
    .eq("plaque_id", plaque.id)
    .maybeSingle();
  if (pageError) {
    console.error("Smart Page click page lookup failed", { code: pageError.code });
    return failed();
  }
  if (!page) return missing();

  const { data: button, error: buttonError } = await supabase
    .from("smart_page_buttons")
    .select("id, label, destination_url")
    .eq("id", buttonId)
    .eq("smart_page_id", page.id)
    .eq("enabled", true)
    .maybeSingle();
  if (buttonError) {
    console.error("Smart Page click button lookup failed", { code: buttonError.code });
    return failed();
  }
  if (!button) return missing();

  const destination = safeHttpUrl(button.destination_url);
  if (!destination) return unavailable();

  const { error: clickError } = await supabase.from("smart_page_clicks").insert({
    plaque_id: plaque.id,
    button_id: button.id,
    button_label_snapshot: button.label,
  });
  if (clickError) {
    console.error("Smart Page click insert failed", { code: clickError.code });
  }

  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
