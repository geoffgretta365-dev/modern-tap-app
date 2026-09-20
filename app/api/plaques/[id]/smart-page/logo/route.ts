import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "smart-page-assets";
const MAX_SIZE = 4 * 1024 * 1024;
const formats: Record<string, { ext: string; signature: (bytes: Uint8Array) => boolean }> = {
  "image/png": { ext: "png", signature: (b) => b.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => b[i] === n) },
  "image/jpeg": { ext: "jpg", signature: (b) => b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255 },
  "image/webp": { ext: "webp", signature: (b) => b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
};
const reply = (error: string, status: number) => NextResponse.json({ error }, { status });
const failed = () => reply("Could not update the logo. Please try again.", 500);

async function ownedPage(id: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { response: reply("Sign in to manage this plaque.", 401) };
  const { data: business, error: businessError } = await supabase.from("businesses")
    .select("id").eq("owner_id", user.id).maybeSingle();
  if (businessError) return { response: failed() };
  if (!business) return { response: reply("Business not found.", 403) };
  const { data: plaque, error: plaqueError } = await supabase.from("plaques")
    .select("id").eq("id", id).eq("business_id", business.id).maybeSingle();
  if (plaqueError) return { response: failed() };
  if (!plaque) return { response: reply("Plaque not found.", 404) };
  const { data: page, error: pageError } = await supabase.from("smart_pages")
    .select("id, logo_path").eq("plaque_id", plaque.id).maybeSingle();
  if (pageError) return { response: failed() };
  if (!page) return { response: reply("Smart Page not found.", 404) };
  return { supabase, business, plaque, page };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedPage(id);
  if (owned.response) return owned.response;
  const { business, plaque, page } = owned;
  if (!business || !plaque || !page?.logo_path ||
      !page.logo_path.startsWith(`${business.id}/${plaque.id}/`)) {
    return new NextResponse("Logo unavailable", { status: 404 });
  }
  const { data: image, error } = await createAdminClient().storage.from(BUCKET).download(page.logo_path);
  if (error || !image) {
    if (error) console.error("Smart Page editor logo download failed", { code: error.name });
    return new NextResponse("Logo unavailable", { status: 404 });
  }
  if (!Object.hasOwn(formats, image.type)) return new NextResponse("Logo unavailable", { status: 404 });
  return new NextResponse(image, {
    headers: { "Content-Type": image.type, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedPage(id);
  if (owned.response) return owned.response;
  const { supabase, business, plaque, page } = owned;
  if (!supabase || !business || !plaque || !page) return failed();

  let file: FormDataEntryValue | null;
  try { file = (await request.formData()).get("logo"); }
  catch { return reply("Select a valid image to upload.", 400); }
  if (!(file instanceof File)) return reply("Select an image to upload.", 400);
  const format = formats[file.type];
  if (!format) return reply("Use a PNG, JPEG, or WebP image.", 400);
  if (!file.size || file.size > MAX_SIZE) return reply("Logo must be 4 MB or smaller.", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!format.signature(bytes)) return reply("The image format does not match the file.", 400);

  const path = `${business.id}/${plaque.id}/${randomUUID()}.${format.ext}`;
  const storage = createAdminClient().storage.from(BUCKET);
  const { error: uploadError } = await storage.upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("Smart Page logo upload failed", { code: uploadError.name });
    return reply("Logo upload failed. Check that Smart Page storage is configured, then try again.", 500);
  }

  let update = supabase.from("smart_pages").update({ logo_path: path, updated_at: new Date().toISOString() })
    .eq("id", page.id).eq("plaque_id", plaque.id);
  update = page.logo_path ? update.eq("logo_path", page.logo_path) : update.is("logo_path", null);
  const { data: changed, error: updateError } = await update.select("id").maybeSingle();
  if (updateError || !changed) {
    const { error: cleanupError } = await storage.remove([path]);
    if (cleanupError) console.error("Smart Page logo cleanup failed", { code: cleanupError.name });
    return reply("Logo changed while uploading. Refresh and try again.", 409);
  }
  if (page.logo_path && page.logo_path.startsWith(`${business.id}/${plaque.id}/`)) {
    const { error: cleanupError } = await storage.remove([page.logo_path]);
    if (cleanupError) console.error("Smart Page old logo cleanup failed", { code: cleanupError.name });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await ownedPage(id);
  if (owned.response) return owned.response;
  const { supabase, business, plaque, page } = owned;
  if (!supabase || !business || !plaque || !page) return failed();
  if (!page.logo_path) return NextResponse.json({ ok: true });
  const update = supabase.from("smart_pages").update({ logo_path: null, updated_at: new Date().toISOString() })
    .eq("id", page.id).eq("plaque_id", plaque.id).eq("logo_path", page.logo_path);
  const { data: changed, error: updateError } = await update.select("id").maybeSingle();
  if (updateError || !changed) return reply("Logo changed. Refresh and try again.", 409);
  if (page.logo_path.startsWith(`${business.id}/${plaque.id}/`)) {
    const { error: removeError } = await createAdminClient().storage.from(BUCKET).remove([page.logo_path]);
    if (removeError) console.error("Smart Page logo removal failed", { code: removeError.name });
  }
  return NextResponse.json({ ok: true });
}
