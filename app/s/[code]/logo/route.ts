import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const missing = () => new NextResponse("Logo unavailable", { status: 404 });
const failed = () => new NextResponse("Logo unavailable", { status: 500 });

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createAdminClient();
  const { data: plaque, error: plaqueError } = await supabase.from("plaques")
    .select("id, business_id").eq("code", code).eq("active", true)
    .eq("mode", "smart_page").maybeSingle();
  if (plaqueError) {
    console.error("Smart Page logo plaque lookup failed", { code: plaqueError.code });
    return failed();
  }
  if (!plaque) return missing();
  const { data: page, error: pageError } = await supabase.from("smart_pages")
    .select("logo_path").eq("plaque_id", plaque.id).maybeSingle();
  if (pageError) {
    console.error("Smart Page logo lookup failed", { code: pageError.code });
    return failed();
  }
  const path = page?.logo_path;
  if (!path || !path.startsWith(`${plaque.business_id}/${plaque.id}/`)) return missing();
  const { data: image, error: imageError } = await supabase.storage.from("smart-page-assets").download(path);
  if (imageError || !image) {
    if (imageError) console.error("Smart Page logo download failed", { code: imageError.name });
    return missing();
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(image.type)) return missing();
  return new NextResponse(image, {
    headers: { "Content-Type": image.type, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" },
  });
}
