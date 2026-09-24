export const instant = false;

import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import SmartPageView from "@/components/smart-page/smart-page-view";
import { resolvePresentation } from "@/lib/smart-page-presentation";

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

export default async function SmartPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = createAdminClient();
  const { data: plaque, error: plaqueError } = await supabase
    .from("plaques")
    .select("id, destination_url")
    .eq("code", code)
    .eq("active", true)
    .eq("mode", "smart_page")
    .maybeSingle();

  if (plaqueError) {
    console.error("Public Smart Page plaque lookup failed", { code: plaqueError.code });
    notFound();
  }
  if (!plaque) notFound();

  const fallback = safeHttpUrl(plaque.destination_url);
  const { data: page, error: pageError } = await supabase
    .from("smart_pages")
    .select("id, heading, subheading, logo_path, updated_at, theme_preset, background_color, text_color, button_color, button_text_color, button_style, button_radius, presentation_version, page_background_color, background_mode, gradient_end_color, gradient_direction, logo_size, content_alignment")
    .eq("plaque_id", plaque.id)
    .maybeSingle();

  if (pageError) {
    console.error("Public Smart Page lookup failed", { code: pageError.code });
    if (fallback) redirect(fallback);
    notFound();
  }
  if (!page) {
    if (fallback) redirect(fallback);
    notFound();
  }

  const { data: buttons, error: buttonsError } = await supabase
    .from("smart_page_buttons")
    .select("id, label, destination_url, icon_key, image_path, updated_at")
    .eq("smart_page_id", page.id)
    .eq("enabled", true)
    .order("position", { ascending: true })
    .order("id", { ascending: true });

  if (buttonsError) {
    console.error("Public Smart Page buttons lookup failed", { code: buttonsError.code });
    if (fallback) redirect(fallback);
    notFound();
  }

  const usableButtons = (buttons ?? []).flatMap((button) => {
    return safeHttpUrl(button.destination_url)
      ? [{ ...button }]
      : [];
  });

  if (usableButtons.length === 0) {
    if (fallback) redirect(fallback);
    notFound();
  }

  return <SmartPageView heading={page.heading ?? ""} subheading={page.subheading ?? ""}
    logoSrc={page.logo_path ? `/s/${encodeURIComponent(code)}/logo?v=${encodeURIComponent(page.updated_at)}` : null}
    appearance={resolvePresentation(page)} actions={usableButtons.map(button => ({
      id: button.id, label: button.label, iconKey: button.icon_key,
      href: `/s/${encodeURIComponent(code)}/go/${encodeURIComponent(button.id)}`,
      imageSrc: button.image_path ? `/s/${encodeURIComponent(code)}/buttons/${encodeURIComponent(button.id)}/image?v=${encodeURIComponent(button.updated_at)}` : null,
    }))} />;
}
