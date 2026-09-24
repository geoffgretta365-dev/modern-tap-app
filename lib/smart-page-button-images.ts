import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const BUTTON_IMAGE_BUCKET = "smart-page-assets";
export const MAX_BUTTON_IMAGE_SIZE = 4 * 1024 * 1024;
export const imageFormats: Record<string, { ext: string; signature: (bytes: Uint8Array) => boolean }> = {
  "image/png": { ext: "png", signature: b => b.length >= 8 && [137,80,78,71,13,10,26,10].every((n,i) => b[i] === n) },
  "image/jpeg": { ext: "jpg", signature: b => b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255 },
  "image/webp": { ext: "webp", signature: b => b.length >= 12 && String.fromCharCode(...b.slice(0,4)) === "RIFF" && String.fromCharCode(...b.slice(8,12)) === "WEBP" },
};
export function buttonImagePrefix(businessId: string, plaqueId: string, buttonId: string) {
  return `${businessId}/${plaqueId}/buttons/${buttonId}/`;
}
export function isScopedButtonImage(path: unknown, prefix: string): path is string {
  return typeof path === "string" && path.startsWith(prefix) && /^[0-9a-f-]+\.(png|jpg|webp)$/.test(path.slice(prefix.length));
}
export async function removeButtonImage(path: unknown, prefix: string) {
  if (!isScopedButtonImage(path, prefix)) return;
  const { error } = await createAdminClient().storage.from(BUTTON_IMAGE_BUCKET).remove([path]);
  if (error) console.error("Button image cleanup failed", { code: error.name });
}
export async function deliverButtonImage(path: unknown, prefix: string) {
  if (!isScopedButtonImage(path, prefix)) return new NextResponse("Image unavailable", { status: 404 });
  const { data, error } = await createAdminClient().storage.from(BUTTON_IMAGE_BUCKET).download(path);
  if (error || !data || !Object.hasOwn(imageFormats, data.type)) return new NextResponse("Image unavailable", { status: 404 });
  return new NextResponse(data, { headers: { "Content-Type": data.type, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
}
