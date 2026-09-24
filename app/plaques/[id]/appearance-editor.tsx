"use client";

import { appearanceContrastError, BUTTON_RADII, BUTTON_STYLES, presentationPresets, V2_PRESETS, THEME_PRESETS } from "@/lib/smart-page-appearance";
import { SMART_PAGE_DESIGNS } from "@/lib/smart-page-designs";
import { LEGACY_THEMES, resolvePresentation, type Presentation } from "@/lib/smart-page-presentation";

const colors = [
  ["background_color", "Content surface", "surfaceBackground"],
  ["text_color", "Text", "textColor"],
  ["button_color", "Button", "buttonColor"],
  ["button_text_color", "Button text", "buttonTextColor"],
] as const;

export default function AppearanceEditor({ draft, onChange, onSave, onReset, saving, message }: {
  draft: Presentation; onChange: (patch: Partial<Presentation>) => void;
  onSave: () => void; onReset: () => void; saving: boolean; message: string;
}) {
  const presets = presentationPresets(draft);
  const resolved = resolvePresentation(draft);
  const contrastError = appearanceContrastError(draft);
  return <section className="mt-6 rounded-xl border border-[#dbe4ea] p-4 sm:p-5" aria-labelledby="appearance-title">
    <h3 id="appearance-title" className="text-lg font-bold text-[#17324d]">Design</h3>
    <p className="mt-1 text-sm text-slate-500">Choose a starting point, then make it yours.</p>
    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
      {draft.presentation_version === 1 ? <>
        <p>Your current layout stays unchanged until you explicitly save a V2 appearance.</p>
        <button type="button" onClick={() => onChange({ presentation_version: 2 })} className="mt-2 font-semibold text-[#0f766e] underline">Preview V2 layout</button>
      </> : <p>V2 layout preview. Save V2 Appearance to publish these layout, logo size, and alignment settings.</p>}
    </div>
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {THEME_PRESETS.map(theme => <button key={theme} type="button" aria-pressed={draft.theme_preset === theme}
        onClick={() => onChange({ theme_preset: theme, presentation_version: LEGACY_THEMES.includes(theme) ? draft.presentation_version : 2,
          background_color: null, text_color: null, button_color: null, button_text_color: null, button_style: null, button_radius: null,
          content_alignment: draft.presentation_version === 2 || !LEGACY_THEMES.includes(theme) ? SMART_PAGE_DESIGNS[theme].alignment : null,
          page_background_color: null, gradient_end_color: null, background_mode: null, gradient_direction: null })}
        className={`rounded-xl border p-3 text-left ${draft.theme_preset === theme ? "border-[#0f766e] ring-1 ring-[#0f766e]" : "border-slate-200"}`}>
        <span aria-hidden="true" className="mb-3 block rounded-md border p-3" style={{ backgroundColor: V2_PRESETS[theme].surfaceBackground, color: V2_PRESETS[theme].textColor, borderColor: V2_PRESETS[theme].borderColor }}><span className="block text-lg" style={{ fontFamily: SMART_PAGE_DESIGNS[theme].font }}>Your brand</span><span className="mt-2 block h-3 w-full" style={{ backgroundColor: V2_PRESETS[theme].buttonColor, borderRadius: V2_PRESETS[theme].buttonRadius === "pill" ? 20 : 3 }}/></span>
        <span className="mb-2 flex gap-1" aria-hidden="true">{[presets[theme].pageBackground, presets[theme].surfaceBackground, presets[theme].buttonColor].map((color,i) => <span key={i} className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: color }} />)}</span>
        <span className="block text-sm font-semibold capitalize">{theme}</span>
        <span className="mt-1 block text-xs text-slate-500">{SMART_PAGE_DESIGNS[theme].description}</span>
      </button>)}
    </div>
    {draft.presentation_version === 2 && <fieldset className="mt-6 space-y-3">
      <legend className="text-sm font-semibold">Page background</legend>
      <label className="block text-sm">Style <select className="ml-2 rounded border p-2" value={draft.background_mode ?? "solid"} onChange={e => onChange({ background_mode: e.target.value as "solid" | "gradient" })}><option value="solid">Solid</option><option value="gradient">Gradient</option></select></label>
      <label className="flex items-center justify-between text-sm">Background color<input aria-label="Page background color" type="color" value={draft.page_background_color ?? resolved.pageBackground} onChange={e => onChange({ page_background_color: e.target.value })} /></label>
      {draft.background_mode === "gradient" && <>
        <label className="flex items-center justify-between text-sm">Gradient end color<input aria-label="Gradient end color" type="color" value={draft.gradient_end_color ?? resolved.surfaceBackground} onChange={e => onChange({ gradient_end_color: e.target.value })} /></label>
        <label className="block text-sm">Direction <select className="ml-2 rounded border p-2" value={draft.gradient_direction ?? "down"} onChange={e => onChange({ gradient_direction: e.target.value as "down" | "diagonal" })}><option value="down">Down</option><option value="diagonal">Diagonal</option></select></label>
      </>}
    </fieldset>}
    <div className="mt-6 grid gap-3 sm:grid-cols-2">{colors.map(([key,label,presetKey]) => <label key={key} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
      {key === "background_color" && draft.presentation_version === 1 ? "Background" : label}
      <input type="color" value={draft[key] ?? presets[draft.theme_preset][presetKey]} onChange={e => onChange({ [key]: e.target.value })} />
    </label>)}</div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Button style<select className="mt-1 block w-full rounded border p-2 capitalize" value={resolved.buttonStyle} onChange={e => onChange({ button_style: e.target.value as Presentation["button_style"] })}>{BUTTON_STYLES.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm">Button shape<select className="mt-1 block w-full rounded border p-2 capitalize" value={resolved.buttonRadius} onChange={e => onChange({ button_radius: e.target.value as Presentation["button_radius"] })}>{BUTTON_RADII.map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    {contrastError && <p role="alert" className="mt-4 text-sm text-amber-800">{contrastError}</p>}
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" onClick={() => onChange({ background_color: null, text_color: null, button_color: null, button_text_color: null, button_style: null, button_radius: null, page_background_color: null, background_mode: null, gradient_end_color: null, gradient_direction: null, logo_size: null, content_alignment: null })} className="mt-secondary-action">Reset to Preset</button>
      <button type="button" onClick={onReset} className="mt-secondary-action">Discard Appearance Changes</button>
      <button type="button" disabled={saving || !!contrastError} onClick={onSave} className="mt-primary-action disabled:opacity-50">{saving ? "Saving…" : draft.presentation_version === 2 ? "Save V2 Appearance" : "Save Appearance"}</button>
    </div>
    <p className="mt-2 text-xs text-slate-500">Selecting a theme resets colors and background overrides. Changes stay in preview until saved.</p>
    {message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
  </section>;
}
