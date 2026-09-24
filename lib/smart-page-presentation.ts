import { normalizeAppearance, resolveAppearance, isHexColor, contrastRatio, type SmartPageAppearance } from "@/lib/smart-page-appearance";

export const V2_OPTIONS = {
  background_mode: ["solid", "gradient"],
  gradient_direction: ["down", "diagonal"],
  logo_size: ["small", "medium", "large"],
  content_alignment: ["center", "left"],
} as const;
export type Layout = {
  presentation_version: 1 | 2;
  page_background_color: string | null;
  background_mode: "solid" | "gradient" | null;
  gradient_end_color: string | null;
  gradient_direction: "down" | "diagonal" | null;
  logo_size: "small" | "medium" | "large" | null;
  content_alignment: "center" | "left" | null;
};
export type Presentation = SmartPageAppearance & Layout;
export type PresentationSource = Partial<Record<keyof Presentation, unknown>>;
export const LEGACY_THEMES = ["clean", "dark", "modern", "warm", "minimal", "bold"];
export const LAYOUT_DEFAULTS: Layout = {
  presentation_version: 1, page_background_color: null, background_mode: null,
  gradient_end_color: null, gradient_direction: null, logo_size: null, content_alignment: null,
};
export function validLayout(input: PresentationSource) {
  return (input.presentation_version === 1 || input.presentation_version === 2) &&
    [input.page_background_color, input.gradient_end_color].every(v => v === null || isHexColor(v)) &&
    Object.entries(V2_OPTIONS).every(([key, values]) => {
      const value = input[key as keyof Layout];
      return value === null || (typeof value === "string" && (values as readonly string[]).includes(value));
    });
}
export function normalizePresentation(input: PresentationSource): Presentation {
  const layout = { ...LAYOUT_DEFAULTS, presentation_version: input.presentation_version === 2 ? 2 : 1 } as Layout;
  for (const key of ["page_background_color", "gradient_end_color"] as const) {
    layout[key] = isHexColor(input[key]) ? input[key].toUpperCase() : null;
  }
  for (const key of Object.keys(V2_OPTIONS) as (keyof typeof V2_OPTIONS)[]) {
    const value = input[key];
    if (typeof value === "string" && (V2_OPTIONS[key] as readonly string[]).includes(value)) Object.assign(layout, { [key]: value });
  }
  const appearance = normalizeAppearance(input);
  if (layout.presentation_version === 1 && !LEGACY_THEMES.includes(appearance.theme_preset)) appearance.theme_preset = "clean";
  return { ...appearance, ...layout };
}
export function resolvePresentation(input: PresentationSource) {
  const normalized = normalizePresentation(input);
  const appearance = resolveAppearance(normalized);
  const v2 = normalized.presentation_version === 2;
  const pageBackground = v2 ? normalized.page_background_color ?? appearance.pageBackground : appearance.pageBackground;
  const backgroundImage = v2 && normalized.background_mode === "gradient"
    ? `linear-gradient(${normalized.gradient_direction === "diagonal" ? "135deg" : "180deg"}, ${pageBackground}, ${normalized.gradient_end_color ?? appearance.surfaceBackground})`
    : undefined;
  // Version 1 keeps its original footer behavior. V2 uses readable footer text.
  const footerColor = v2 && contrastRatio(appearance.footerColor, appearance.surfaceBackground) < 4.5
    ? appearance.secondaryTextColor : appearance.footerColor;
  return { ...appearance, ...normalized, pageBackground, backgroundImage, footerColor, v2,
    logoSize: normalized.logo_size ?? "medium", alignment: normalized.content_alignment ?? "center" };
}
export type ResolvedPresentation = ReturnType<typeof resolvePresentation>;
export type PageAction = { id: string; label: string; href: string; iconKey?: string | null; imageSrc?: string | null };
