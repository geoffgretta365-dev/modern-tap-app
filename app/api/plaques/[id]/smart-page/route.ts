import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appearanceContrastError, isButtonRadius, isButtonStyle, isHexColor, isThemePreset } from "@/lib/smart-page-appearance";

import { isSmartPageIconKey } from "@/lib/smart-page-icons";
import { buttonImagePrefix, removeButtonImage } from "@/lib/smart-page-button-images";

import { validLayout, normalizePresentation, LEGACY_THEMES } from "@/lib/smart-page-presentation";

const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const failed = () => bad("Could not save Smart Page changes.", 500);

type Input = Record<string, unknown>;

function textField(value: unknown, limit: number, required = false) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length > limit || (required && !text)) return null;
  return text;
}

function destination(value: unknown) {
  if (typeof value !== "string" || value.trim().length > 2048) return null;
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let input: Input;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return bad("Invalid request.");
    input = parsed as Input;
  } catch {
    return bad("Invalid request.");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return bad("Sign in to manage this plaque.", 401);

  const { data: business, error: businessError } = await supabase
    .from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  if (businessError) return failed();
  if (!business) return bad("Business not found.", 403);

  const { data: plaque, error: plaqueError } = await supabase
    .from("plaques").select("id, mode").eq("id", id).eq("business_id", business.id).maybeSingle();
  if (plaqueError) return failed();
  if (!plaque) return bad("Plaque not found.", 404);

  const { data: page, error: pageError } = await supabase
    .from("smart_pages").select("id, presentation_version").eq("plaque_id", plaque.id).maybeSingle();
  if (pageError) return failed();

  if (input.action === "set_mode") {
    if (input.mode !== "direct_link" && input.mode !== "smart_page") return bad("Invalid destination mode.");
    if (input.mode === "smart_page" && !page) {
      const { error } = await supabase.from("smart_pages").insert({ plaque_id: plaque.id });
      if (error && error.code !== "23505") return failed();
    }
    const { data, error } = await supabase.from("plaques")
      .update({ mode: input.mode }).eq("id", plaque.id).eq("business_id", business.id)
      .select("id").maybeSingle();
    return error || !data ? failed() : NextResponse.json({ ok: true });
  }

  if (plaque.mode !== "smart_page") return bad("Switch to Smart Page mode first.", 409);
  if (!page) return bad("Smart Page is not ready. Switch modes and try again.", 409);

  if (input.action === "save_appearance") {
    const explicitV2 = input.presentation_version === 2;
    if (Object.hasOwn(input, "presentation_version") && !explicitV2 && input.presentation_version !== 1) return bad("Invalid presentation version.");
    if (explicitV2 && !validLayout(input)) return bad("Select valid layout options and six-digit hex colors.");
    if (!explicitV2 && ["page_background_color", "background_mode", "gradient_end_color", "gradient_direction", "logo_size", "content_alignment"].some(key => input[key] != null)) return bad("Save V2 appearance to change layout options.");
    if (!explicitV2 && !LEGACY_THEMES.includes(String(input.theme_preset)) && page.presentation_version !== 2) return bad("New themes require a V2 appearance save.");
    const { theme_preset, background_color, text_color, button_color, button_text_color, button_style, button_radius } = input;
    if (!isThemePreset(theme_preset) ||
        ![background_color, text_color, button_color, button_text_color].every((value) => value === null || isHexColor(value)) ||
        !(button_style === null || isButtonStyle(button_style)) ||
        !(button_radius === null || isButtonRadius(button_radius))) {
      return bad("Select valid appearance options and six-digit hex colors.");
    }
    const appearance = { theme_preset, background_color: background_color as string | null,
      text_color: text_color as string | null, button_color: button_color as string | null,
      button_text_color: button_text_color as string | null,
      button_style: button_style as "solid" | "outline" | "soft" | null,
      button_radius: button_radius as "rounded" | "pill" | "square" | null };
    const contrastError = appearanceContrastError(appearance);
    if (contrastError) return bad(contrastError);
    const { data, error } = await supabase.from("smart_pages")
      .update({ ...(explicitV2 ? normalizePresentation({ ...input, ...appearance }) : appearance), updated_at: new Date().toISOString() })
      .eq("id", page.id).eq("plaque_id", plaque.id).select("id").maybeSingle();
    return error || !data ? failed() : NextResponse.json({ ok: true });
  }

  if (input.action === "save_page") {
    const heading = textField(input.heading, 100);
    const subheading = textField(input.subheading, 240);
    if (heading === null || subheading === null) return bad("Heading or subheading is too long.");
    const { error } = await supabase.from("smart_pages")
      .update({ heading: heading || null, subheading: subheading || null, updated_at: new Date().toISOString() })
      .eq("id", page.id).eq("plaque_id", plaque.id);
    return error ? failed() : NextResponse.json({ ok: true });
  }

  if (Object.hasOwn(input, "image_path")) return bad("Image paths can only be set by uploading an image.");
  if (Object.hasOwn(input, "icon_key") && input.icon_key !== null && !isSmartPageIconKey(input.icon_key)) return bad("Select a valid icon.");

  if (input.action === "add_button") {
    const label = textField(input.label, 80, true);
    const url = destination(input.destination_url);
    if (!label || !url || typeof input.enabled !== "boolean") return bad("Enter a label and an HTTP or HTTPS URL.");
    const { data: last, error: positionError } = await supabase.from("smart_page_buttons")
      .select("position").eq("smart_page_id", page.id).order("position", { ascending: false }).limit(1);
    if (positionError) return failed();
    const { error } = await supabase.from("smart_page_buttons").insert({
      smart_page_id: page.id, label, destination_url: url, icon_key: input.icon_key ?? null,
      enabled: input.enabled, position: (last?.[0]?.position ?? -1) + 1,
    });
    return error ? failed() : NextResponse.json({ ok: true });
  }

  if (typeof input.buttonId !== "string") return bad("Invalid button.");
  const { data: button, error: buttonError } = await supabase.from("smart_page_buttons")
    .select("id, image_path, icon_key, updated_at").eq("id", input.buttonId).eq("smart_page_id", page.id).maybeSingle();
  if (buttonError) return failed();
  if (!button) return bad("Button not found.", 404);

  if (input.action === "update_button") {
    const label = textField(input.label, 80, true);
    const url = destination(input.destination_url);
    if (!label || !url || typeof input.enabled !== "boolean") return bad("Enter a label and an HTTP or HTTPS URL.");
    const media = Object.hasOwn(input, "icon_key") ? { icon_key: input.icon_key, image_path: null } : {};
    const { data, error } = await supabase.from("smart_page_buttons")
      .update({ label, destination_url: url, enabled: input.enabled, ...media, updated_at: new Date().toISOString() })
      .eq("id", button.id).eq("smart_page_id", page.id).eq("updated_at", button.updated_at).select("id").maybeSingle();
    if (error || !data) return bad("Action changed. Refresh and try again.", 409);
    if (Object.hasOwn(input, "icon_key")) await removeButtonImage(button.image_path, buttonImagePrefix(business.id, plaque.id, button.id));
    return NextResponse.json({ ok: true });
  }

  if (input.action === "delete_button") {
    const { data, error } = await supabase.from("smart_page_buttons")
      .delete().eq("id", button.id).eq("smart_page_id", page.id).eq("updated_at", button.updated_at).select("id").maybeSingle();
    if (error || !data) return bad("Action changed. Refresh and try again.", 409);
    await removeButtonImage(button.image_path, buttonImagePrefix(business.id, plaque.id, button.id));
    return NextResponse.json({ ok: true });
  }

  if (input.action === "move_button") {
    if (input.direction !== "up" && input.direction !== "down") return bad("Invalid direction.");
    const { data: buttons, error } = await supabase.from("smart_page_buttons")
      .select("id, smart_page_id, label, destination_url, enabled, position")
      .eq("smart_page_id", page.id).order("position", { ascending: true }).order("id", { ascending: true });
    if (error || !buttons) return failed();
    const index = buttons.findIndex((item) => item.id === button.id);
    const other = index + (input.direction === "up" ? -1 : 1);
    if (index < 0 || other < 0 || other >= buttons.length) return bad("Button cannot move further.");
    [buttons[index], buttons[other]] = [buttons[other], buttons[index]];
    // Only positions change: never overwrite concurrently edited content or media.
    for (const [position, item] of buttons.entries()) {
      const { error: reorderError } = await supabase.from("smart_page_buttons")
        .update({ position }).eq("id", item.id).eq("smart_page_id", page.id);
      if (reorderError) return failed();
    }
    return NextResponse.json({ ok: true });
  }

  return bad("Invalid action.");
}
