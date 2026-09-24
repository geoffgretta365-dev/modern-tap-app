import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonImagePrefix, deliverButtonImage } from "@/lib/smart-page-button-images";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string; buttonId: string }> }) {
  const { code, buttonId } = await params;
  const supabase = createAdminClient();
  const missing = () => new NextResponse("Image unavailable", { status: 404 });
  const { data: plaque } = await supabase.from("plaques").select("id, business_id").eq("code", code).eq("active", true).eq("mode", "smart_page").maybeSingle();
  if (!plaque) return missing();
  const { data: page } = await supabase.from("smart_pages").select("id").eq("plaque_id", plaque.id).maybeSingle();
  if (!page) return missing();
  const { data: button } = await supabase.from("smart_page_buttons").select("id, image_path").eq("id", buttonId).eq("smart_page_id", page.id).eq("enabled", true).maybeSingle();
  if (!button) return missing();
  return deliverButtonImage(button.image_path, buttonImagePrefix(plaque.business_id, plaque.id, button.id));
}
