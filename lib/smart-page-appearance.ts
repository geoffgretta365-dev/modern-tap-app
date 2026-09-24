export const THEME_PRESETS = ["clean", "dark", "modern", "warm", "minimal", "bold", "bistro", "espresso", "studio", "motion", "boutique", "coastal"] as const;
export const BUTTON_STYLES = ["solid", "outline", "soft"] as const;
export const BUTTON_RADII = ["rounded", "pill", "square"] as const;

export type ThemePreset = (typeof THEME_PRESETS)[number];
export type ButtonStyle = (typeof BUTTON_STYLES)[number];
export type ButtonRadius = (typeof BUTTON_RADII)[number];

export type SmartPageAppearance = {
  theme_preset: ThemePreset;
  background_color: string | null;
  text_color: string | null;
  button_color: string | null;
  button_text_color: string | null;
  button_style: ButtonStyle | null;
  button_radius: ButtonRadius | null;
};

type PresetColors = {
  pageBackground: string;
  surfaceBackground: string;
  borderColor: string;
  textColor: string;
  secondaryTextColor: string;
  brandColor: string;
  footerColor: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonStyle: ButtonStyle;
  buttonRadius: ButtonRadius;
};

export const PRESETS: Record<ThemePreset, PresetColors> = {
  clean: {
    pageBackground: "#F8FAFC", surfaceBackground: "#FFFFFF", borderColor: "#E2E8F0",
    textColor: "#020617", secondaryTextColor: "#475569", brandColor: "#64748B", footerColor: "#94A3B8",
    buttonColor: "#020617", buttonTextColor: "#FFFFFF", buttonStyle: "solid", buttonRadius: "rounded",
  },
  dark: {
    pageBackground: "#0F172A", surfaceBackground: "#1E293B", borderColor: "#334155",
    textColor: "#F8FAFC", secondaryTextColor: "#CBD5E1", brandColor: "#CBD5E1", footerColor: "#CBD5E1",
    buttonColor: "#F8FAFC", buttonTextColor: "#0F172A", buttonStyle: "solid", buttonRadius: "rounded",
  },
  modern: {
    pageBackground: "#E0E7FF", surfaceBackground: "#FFFFFF", borderColor: "#C7D2FE",
    textColor: "#1E1B4B", secondaryTextColor: "#3730A3", brandColor: "#4338CA", footerColor: "#4338CA",
    buttonColor: "#3730A3", buttonTextColor: "#FFFFFF", buttonStyle: "solid", buttonRadius: "rounded",
  },
  warm: {
    pageBackground: "#FFF7ED", surfaceBackground: "#FFFBF5", borderColor: "#FED7AA",
    textColor: "#431407", secondaryTextColor: "#7C2D12", brandColor: "#9A3412", footerColor: "#9A3412",
    buttonColor: "#9A3412", buttonTextColor: "#FFF7ED", buttonStyle: "solid", buttonRadius: "rounded",
  },
  minimal: {
    pageBackground: "#F5F5F4", surfaceBackground: "#FFFFFF", borderColor: "#E7E5E4",
    textColor: "#292524", secondaryTextColor: "#57534E", brandColor: "#57534E", footerColor: "#78716C",
    buttonColor: "#44403C", buttonTextColor: "#292524", buttonStyle: "outline", buttonRadius: "square",
  },
  bold: {
    pageBackground: "#172554", surfaceBackground: "#1E3A8A", borderColor: "#1D4ED8",
    textColor: "#FFFFFF", secondaryTextColor: "#DBEAFE", brandColor: "#DBEAFE", footerColor: "#DBEAFE",
    buttonColor: "#FACC15", buttonTextColor: "#172554", buttonStyle: "solid", buttonRadius: "pill",
  },
  bistro: {
    pageBackground: "#F3E9DC", surfaceBackground: "#FFFCF7", borderColor: "#E7CDBF",
    textColor: "#40251D", secondaryTextColor: "#40251D", brandColor: "#9C442B", footerColor: "#40251D",
    buttonColor: "#9C442B", buttonTextColor: "#FFFFFF", buttonStyle: "solid", buttonRadius: "rounded",
  },
  espresso: {
    pageBackground: "#EDE2D5", surfaceBackground: "#FFFBF5", borderColor: "#DDCFC1",
    textColor: "#35251F", secondaryTextColor: "#35251F", brandColor: "#634334", footerColor: "#35251F",
    buttonColor: "#634334", buttonTextColor: "#FFFFFF", buttonStyle: "solid", buttonRadius: "rounded",
  },
  studio: {
    pageBackground: "#F7EAF0", surfaceBackground: "#FFFCFD", borderColor: "#EBD9E4",
    textColor: "#45263C", secondaryTextColor: "#45263C", brandColor: "#743B62", footerColor: "#45263C",
    buttonColor: "#743B62", buttonTextColor: "#45263C", buttonStyle: "soft", buttonRadius: "rounded",
  },
  motion: {
    pageBackground: "#151919", surfaceBackground: "#222828", borderColor: "#3B4540",
    textColor: "#F5FAF6", secondaryTextColor: "#F5FAF6", brandColor: "#C7F36B", footerColor: "#F5FAF6",
    buttonColor: "#C7F36B", buttonTextColor: "#17200B", buttonStyle: "solid", buttonRadius: "rounded",
  },
  boutique: {
    pageBackground: "#EDEFE8", surfaceBackground: "#FFFEFA", borderColor: "#D9E3D9",
    textColor: "#263D30", secondaryTextColor: "#263D30", brandColor: "#315C43", footerColor: "#263D30",
    buttonColor: "#315C43", buttonTextColor: "#263D30", buttonStyle: "outline", buttonRadius: "rounded",
  },
  coastal: {
    pageBackground: "#DFEFF1", surfaceBackground: "#F9FDFD", borderColor: "#CDE2E5",
    textColor: "#173E45", secondaryTextColor: "#173E45", brandColor: "#176471", footerColor: "#173E45",
    buttonColor: "#176471", buttonTextColor: "#FFFFFF", buttonStyle: "solid", buttonRadius: "rounded",
  },
};

export function isThemePreset(value: unknown): value is ThemePreset {
  return typeof value === "string" && (THEME_PRESETS as readonly string[]).includes(value);
}
export function isButtonStyle(value: unknown): value is ButtonStyle {
  return typeof value === "string" && (BUTTON_STYLES as readonly string[]).includes(value);
}
export function isButtonRadius(value: unknown): value is ButtonRadius {
  return typeof value === "string" && (BUTTON_RADII as readonly string[]).includes(value);
}
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function channel(hex: string, offset: number) {
  return parseInt(hex.slice(offset, offset + 2), 16);
}
function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = channel(hex, offset) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
export function contrastRatio(first: string, second: string) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function readableText(preferred: string, background: string, alternative: string) {
  if (contrastRatio(preferred, background) >= 4.5) return preferred;
  return [alternative, "#020617", "#FFFFFF"]
    .sort((a, b) => contrastRatio(b, background) - contrastRatio(a, background))[0];
}
function blend(first: string, second: string, weight: number) {
  const values = [1, 3, 5].map((offset) => Math.round(
    channel(first, offset) * weight + channel(second, offset) * (1 - weight),
  ));
  return `#${values.map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function resolveAppearance(input: Partial<Record<keyof SmartPageAppearance, unknown>>) {
  const presetValid = isThemePreset(input.theme_preset);
  const presetName = presetValid ? input.theme_preset as ThemePreset : "clean";
  const preset = PRESETS[presetName];
  const overrides = presetValid ? input : {};
  const background = isHexColor(overrides.background_color) ? overrides.background_color.toUpperCase() : null;
  const pageBackground = background ?? preset.pageBackground;
  const surfaceBackground = background ?? preset.surfaceBackground;
  const textColor = readableText(
    isHexColor(overrides.text_color) ? overrides.text_color.toUpperCase() : preset.textColor,
    surfaceBackground, preset.textColor,
  );
  const secondaryTextColor = readableText(preset.secondaryTextColor, surfaceBackground, textColor);
  const brandColor = readableText(preset.brandColor, surfaceBackground, textColor);
  const footerColor = presetName === "clean" && !background ? preset.footerColor
    : readableText(preset.footerColor, surfaceBackground, textColor);
  const buttonStyle = isButtonStyle(overrides.button_style) ? overrides.button_style : preset.buttonStyle;
  const buttonRadius = isButtonRadius(overrides.button_radius) ? overrides.button_radius : preset.buttonRadius;
  const buttonColor = isHexColor(overrides.button_color) ? overrides.button_color.toUpperCase() : preset.buttonColor;
  const buttonBackground = buttonStyle === "solid" ? buttonColor
    : buttonStyle === "soft" ? blend(buttonColor, surfaceBackground, 0.14) : "transparent";
  const buttonTextColor = readableText(
    isHexColor(overrides.button_text_color) ? overrides.button_text_color.toUpperCase()
      : buttonStyle === "solid" ? preset.buttonTextColor : textColor,
    buttonStyle === "outline" ? surfaceBackground : buttonBackground, textColor,
  );
  const buttonBorderColor = buttonStyle === "outline" && contrastRatio(buttonColor, surfaceBackground) < 3
    ? textColor : buttonColor;
  const legacyClean = presetName === "clean" &&
    !background && !isHexColor(overrides.text_color) && !isHexColor(overrides.button_color) &&
    !isHexColor(overrides.button_text_color) && !isButtonStyle(overrides.button_style) &&
    !isButtonRadius(overrides.button_radius);

  return {
    pageBackground, surfaceBackground, borderColor: preset.borderColor,
    textColor, secondaryTextColor, brandColor, footerColor,
    buttonStyle, buttonRadius, buttonBackground, buttonTextColor, buttonBorderColor, legacyClean,
  };
}

export function normalizeAppearance(input: Partial<Record<keyof SmartPageAppearance, unknown>>): SmartPageAppearance {
  return {
    theme_preset: isThemePreset(input.theme_preset) ? input.theme_preset : "clean",
    background_color: isHexColor(input.background_color) ? input.background_color.toUpperCase() : null,
    text_color: isHexColor(input.text_color) ? input.text_color.toUpperCase() : null,
    button_color: isHexColor(input.button_color) ? input.button_color.toUpperCase() : null,
    button_text_color: isHexColor(input.button_text_color) ? input.button_text_color.toUpperCase() : null,
    button_style: isButtonStyle(input.button_style) ? input.button_style : null,
    button_radius: isButtonRadius(input.button_radius) ? input.button_radius : null,
  };
}

export function appearanceContrastError(input: SmartPageAppearance): string | null {
  const resolved = resolveAppearance(input);
  const preset = PRESETS[input.theme_preset];
  const mainText = input.text_color ?? preset.textColor;
  const buttonText = input.button_text_color ??
    (resolved.buttonStyle === preset.buttonStyle ? preset.buttonTextColor : resolved.buttonTextColor);
  const buttonBackground = resolved.buttonStyle === "outline"
    ? resolved.surfaceBackground : resolved.buttonBackground;
  if (contrastRatio(mainText, resolved.surfaceBackground) < 4.5 ||
      contrastRatio(buttonText, buttonBackground) < 4.5) {
    return "Choose colors with more contrast so this page stays readable.";
  }
  return null;
}
