import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUTTON_IMAGE_BUCKET, MAX_BUTTON_IMAGE_SIZE, imageFormats, buttonImagePrefix, removeButtonImage, deliverButtonImage } from "@/lib/smart-page-button-images";

const reply = (error: string, status: number) => NextResponse.json({ error }, { status });
type Context = { params: Promise<{ id: string; buttonId: string }> };
async function ownedButton(id: string, buttonId: string) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: reply("Sign in to manage this plaque.", 401) };
  const { data: business } = await supabase.from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  if (!business) return { response: reply("Business not found.", 403) };
  const { data: plaque } = await supabase.from("plaques").select("id").eq("id", id).eq("business_id", business.id).maybeSingle();
  if (!plaque) return { response: reply("Plaque not found.", 404) };
  const { data: page } = await supabase.from("smart_pages").select("id").eq("plaque_id", plaque.id).maybeSingle();
  if (!page) return { response: reply("Smart Page not found.", 404) };
  const { data: button } = await supabase.from("smart_page_buttons").select("id, image_path, icon_key, updated_at").eq("id", buttonId).eq("smart_page_id", page.id).maybeSingle();
  if (!button) return { response: reply("Action not found.", 404) };
  return { supabase, page, button, prefix: buttonImagePrefix(business.id, plaque.id, button.id) };
}
export async function GET(_request: Request, { params }: Context) {
  const { id, buttonId } = await params;
  const owned = await ownedButton(id, buttonId);
  if (owned.response) return owned.response;
  return deliverButtonImage(owned.button!.image_path, owned.prefix!);
}
export async function POST(request: Request, { params }: Context) {
  const { id, buttonId } = await params;
  const owned = await ownedButton(id, buttonId);
  if (owned.response) return owned.response;
  const { supabase, page, button, prefix } = owned;
  if (!supabase || !page || !button || !prefix) return reply("Action unavailable.", 404);
  let file;
  try { file = (await request.formData()).get("image"); } catch { return reply("Select a valid image.", 400); }
  if (!(file instanceof File)) return reply("Select an image.", 400);
  const format = Object.hasOwn(imageFormats, file.type) ? imageFormats[file.type] : null;
  if (!format) return reply("Use PNG, JPEG, or WebP.", 400);
  if (!file.size || file.size > MAX_BUTTON_IMAGE_SIZE) return reply("Image must be 4 MiB or smaller.", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!format.signature(bytes)) return reply("Image format does not match the file.", 400);
  const path = `${prefix}${randomUUID()}.${format.ext}`;
  const { error } = await createAdminClient().storage.from(BUTTON_IMAGE_BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return reply("Image upload failed. Please try again.", 500);
  const updated_at = new Date().toISOString();
  const { data: changed, error: updateError } = await supabase.from("smart_page_buttons")
    .update({ image_path: path, icon_key: null, updated_at }).eq("id", button.id).eq("smart_page_id", page.id)
    .eq("updated_at", button.updated_at).select("id").maybeSingle();
  if (updateError || !changed) {
    await removeButtonImage(path, prefix);
    return reply("Action changed while uploading. Refresh and try again.", 409);
  }
  await removeButtonImage(button.image_path, prefix);
  return NextResponse.json({ ok: true, image_path: path, updated_at });
}
export async function DELETE(_request: Request, { params }: Context) {
  const { id, buttonId } = await params;
  const owned = await ownedButton(id, buttonId);
  if (owned.response) return owned.response;
  const { supabase, page, button, prefix } = owned;
  if (!supabase || !page || !button || !prefix) return reply("Action unavailable.", 404);
  const { data, error } = await supabase.from("smart_page_buttons")
    .update({ image_path: null, icon_key: null, updated_at: new Date().toISOString() })
    .eq("id", button.id).eq("smart_page_id", page.id).eq("updated_at", button.updated_at).select("id").maybeSingle();
  if (error || !data) return reply("Action changed. Refresh and try again.", 409);
  await removeButtonImage(button.image_path, prefix);
  return NextResponse.json({ ok: true });
}
