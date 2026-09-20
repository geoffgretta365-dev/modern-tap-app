"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SmartPageLogo from "@/app/s/[code]/smart-page-logo";
import {
  appearanceContrastError, BUTTON_RADII, BUTTON_STYLES, normalizeAppearance,
  PRESETS, resolveAppearance, THEME_PRESETS,
  type SmartPageAppearance, type ThemePreset,
} from "@/lib/smart-page-appearance";

type AppearanceSource = Partial<Record<keyof SmartPageAppearance, unknown>>;
type PreviewButton = { id: string; label: string; destination_url: string; enabled: boolean };
const colorFields = [
  ["background_color", "Background Color", "surfaceBackground"],
  ["text_color", "Text Color", "textColor"],
  ["button_color", "Button Color", "buttonColor"],
  ["button_text_color", "Button Text Color", "buttonTextColor"],
] as const;
const noOverrides = {
  background_color: null, text_color: null, button_color: null,
  button_text_color: null, button_style: null, button_radius: null,
} as const;

export default function AppearanceEditor({ plaqueId, initial, heading, subheading,
  logoPresent, logoVersion, buttons,
}: {
  plaqueId: string; initial: AppearanceSource;
  heading: string; subheading: string; logoPresent: boolean; logoVersion: string;
  buttons: PreviewButton[];
}) {
  const router = useRouter();
  const { theme_preset, background_color, text_color, button_color, button_text_color,
    button_style, button_radius } = initial;
  const savedAppearance = useMemo(() => normalizeAppearance({
    theme_preset, background_color, text_color, button_color, button_text_color,
    button_style, button_radius,
  }), [
    theme_preset, background_color, text_color, button_color, button_text_color,
    button_style, button_radius,
  ]);
  const [draft, setDraft] = useState<SmartPageAppearance>(savedAppearance);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setDraft(savedAppearance); }, [savedAppearance]);
  const resolved = resolveAppearance(draft);
  const contrastError = appearanceContrastError(draft);
  const radius = resolved.buttonRadius === "pill" ? "9999px" : resolved.buttonRadius === "square" ? "4px" : "12px";
  const visibleButtons = buttons.filter((button) => {
    if (!button.enabled) return false;
    try { const url = new URL(button.destination_url); return url.protocol === "http:" || url.protocol === "https:"; }
    catch { return false; }
  });

  function selectPreset(theme_preset: ThemePreset) {
    setDraft({ theme_preset, ...noOverrides });
    setMessage("");
  }
  async function saveAppearance() {
    if (contrastError) { setMessage(contrastError); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/plaques/${encodeURIComponent(plaqueId)}/smart-page`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_appearance", ...draft }),
      });
      if (!response.ok) {
        const result: { error?: string } = await response.json();
        throw new Error(result.error || "Could not save appearance.");
      }
      setMessage("Appearance saved.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save appearance."); }
    finally { setSaving(false); }
  }

  return <section className="mt-8 border-t border-slate-200 pt-7" aria-labelledby="appearance-title">
    <h3 id="appearance-title" className="text-lg font-bold text-slate-950">Appearance</h3>
    <p className="mt-1 text-sm text-slate-500">Choose a theme, then customize colors and buttons. Preview changes before saving.</p>
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Theme</h4>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {THEME_PRESETS.map((preset) => <button key={preset} type="button" onClick={() => selectPreset(preset)}
              aria-pressed={draft.theme_preset === preset}
              className={`rounded-xl border p-3 text-left text-sm font-semibold capitalize ${draft.theme_preset === preset ? "border-slate-950 ring-1 ring-slate-950" : "border-slate-200 hover:border-slate-400"}`}>
              <span className="mb-2 flex gap-1">
                <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: PRESETS[preset].pageBackground }} />
                <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: PRESETS[preset].buttonColor }} />
              </span>
              {preset}
            </button>)}
          </div>
          <p className="mt-2 text-xs text-slate-500">Choosing a theme clears custom appearance changes.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Colors</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {colorFields.map(([field, label, presetField]) => {
              const color = draft[field] ?? PRESETS[draft.theme_preset][presetField];
              return <label key={field} className="rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700">
                {label}
                <span className="mt-2 flex items-center gap-2">
                  <input type="color" value={color} onChange={(e) => {
                    setDraft((current) => ({ ...current, [field]: e.target.value.toUpperCase() })); setMessage("");
                  }} className="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1" />
                  <span className="font-mono text-xs text-slate-600">{color.toUpperCase()}</span>
                  {draft[field] === null && <span className="text-xs text-slate-400">Preset</span>}
                </span>
              </label>;
            })}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Button Style</h4>
          <div className="mt-2 flex flex-wrap gap-2">{BUTTON_STYLES.map((style) =>
            <button key={style} type="button" aria-pressed={resolved.buttonStyle === style}
              onClick={() => { setDraft((current) => ({ ...current, button_style: style })); setMessage(""); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${resolved.buttonStyle === style ? "bg-slate-950 text-white" : "border border-slate-300 text-slate-700"}`}>{style}</button>)}</div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Button Shape</h4>
          <div className="mt-2 flex flex-wrap gap-2">{BUTTON_RADII.map((shape) =>
            <button key={shape} type="button" aria-pressed={resolved.buttonRadius === shape}
              onClick={() => { setDraft((current) => ({ ...current, button_radius: shape })); setMessage(""); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${resolved.buttonRadius === shape ? "bg-slate-950 text-white" : "border border-slate-300 text-slate-700"}`}>{shape}</button>)}</div>
        </div>
        {contrastError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{contrastError}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { setDraft((current) => ({ ...current, ...noOverrides })); setMessage(""); }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Reset to Preset</button>
          <button type="button" disabled={saving || !!contrastError} onClick={saveAppearance}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Appearance"}</button>
        </div>
        <p className="text-xs text-slate-500">Reset changes the preview; save to publish it.</p>
        {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Live Preview</h4>
        <p className="mt-1 text-xs text-slate-500">Buttons are display only here. The public page updates after saving.</p>
        <div className="mx-auto mt-4 max-w-[360px] rounded-[2.4rem] border-[8px] border-[#17324d] bg-[#17324d] p-1.5 shadow-xl">
          <div className="flex min-h-[480px] max-h-[620px] flex-col justify-center overflow-y-auto rounded-[1.6rem] bg-slate-50 p-3"
            style={!resolved.legacyClean ? { backgroundColor: resolved.pageBackground, color: resolved.textColor } : undefined}>
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm"
              style={!resolved.legacyClean ? { backgroundColor: resolved.surfaceBackground, borderColor: resolved.borderColor } : undefined}>
              <p className="text-sm font-bold tracking-wide text-slate-500"
                style={!resolved.legacyClean ? { color: resolved.brandColor } : undefined}>ModernTap</p>
              {logoPresent && <SmartPageLogo key={logoVersion} src={`/api/plaques/${encodeURIComponent(plaqueId)}/smart-page/logo?v=${encodeURIComponent(logoVersion)}`} />}
              {heading && <p className="mt-5 text-2xl font-bold tracking-tight text-slate-950"
                style={!resolved.legacyClean ? { color: resolved.textColor } : undefined}>{heading}</p>}
              {subheading && <p className="mt-3 text-sm leading-6 text-slate-600"
                style={!resolved.legacyClean ? { color: resolved.secondaryTextColor } : undefined}>{subheading}</p>}
              <div className="mt-8 space-y-3">{visibleButtons.map((button) =>
                <span key={button.id} className="block rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                  style={!resolved.legacyClean ? {
                    backgroundColor: resolved.buttonBackground, color: resolved.buttonTextColor,
                    borderColor: resolved.buttonBorderColor, borderStyle: "solid",
                    borderWidth: resolved.buttonStyle === "outline" ? 1 : 0,
                    borderRadius: radius, minHeight: 48,
                  } : undefined}>{button.label}</span>)}</div>
              <p className="mt-8 text-xs text-slate-400"
                style={!resolved.legacyClean ? { color: resolved.footerColor } : undefined}>Powered by ModernTap</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
