"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ActionContent from "@/components/smart-page/action-content";
import { SMART_PAGE_ICONS, isSmartPageIconKey } from "@/lib/smart-page-icons";
import SmartPagePreview from "@/components/smart-page/smart-page-preview";
import { normalizePresentation, resolvePresentation, type Layout } from "@/lib/smart-page-presentation";
import { mergeActionDrafts } from "@/lib/smart-page-drafts";
import { useSmartPageDraft } from "./use-smart-page-draft";
import AppearanceEditor from "./appearance-editor";

type Button = { id: string; label: string; destination_url: string; enabled: boolean; position: number; icon_key: string | null; image_path: string | null; updated_at: string };
type Page = (Partial<Layout> & { heading: string | null; subheading: string | null; logo_path: string | null;
  updated_at: string; theme_preset: string; background_color: string | null; text_color: string | null;
  button_color: string | null; button_text_color: string | null; button_style: string | null;
  button_radius: string | null }) | null;

async function save(plaqueId: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/plaques/${encodeURIComponent(plaqueId)}/smart-page`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!response.ok) {
    const result: { error?: string } = await response.json();
    throw new Error(result.error || "Could not save changes.");
  }
}

function ButtonRow({ plaqueId, button, first, last, onDraftChange }: { plaqueId: string; button: Button; first: boolean; last: boolean;
  onDraftChange: (id: string, patch: Partial<Button>) => void }) {
  const router = useRouter();
  const [row, setRow] = useSmartPageDraft({ label: button.label, url: button.destination_url, enabled: button.enabled,
    mediaMode: button.image_path ? "upload" : button.icon_key ? "icon" : "none", iconKey: button.icon_key ?? "website" });
  const { label, url, enabled, mediaMode, iconKey } = row;
  const setLabel = (label: string) => setRow(current => ({ ...current, label }));
  const setUrl = (url: string) => setRow(current => ({ ...current, url }));
  const setEnabled = (enabled: boolean) => setRow(current => ({ ...current, enabled }));
  const setMediaMode = (mediaMode: string) => setRow(current => ({ ...current, mediaMode }));
  const setIconKey = (iconKey: string) => setRow(current => ({ ...current, iconKey }));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setMessage("");
    try {
      await save(plaqueId, { action, buttonId: button.id, ...extra });
      setMessage(action === "update_button" ? "Action saved." : "");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save changes."); }
    finally { setBusy(false); }
  }
  async function uploadImage() {
    if (!imageFile) return;
    setBusy(true); setMessage("");
    try {
      const body = new FormData(); body.set("image", imageFile);
      const response = await fetch(`/api/plaques/${encodeURIComponent(plaqueId)}/smart-page/buttons/${encodeURIComponent(button.id)}/image`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      setRow(current => ({ ...current, mediaMode: "upload", iconKey: "website" }));
      onDraftChange(button.id, { icon_key: null, image_path: result.image_path, updated_at: result.updated_at });
      setImageFile(null); if (imageInput.current) imageInput.current.value = "";
      setMessage("Image published."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(false); }
  }
  return <div className="min-w-0 rounded-xl border border-[#dbe4ea] bg-[#f8fcfd] p-4">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <p className="min-w-0 break-words text-sm font-semibold text-[#17324d]">{button.label}</p>
      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">{enabled ? "Visible" : "Hidden"}</span>
    </div>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="min-w-0 text-sm font-medium text-slate-700">Action Name
        <input value={label} maxLength={80} onChange={(e) => { setLabel(e.target.value); onDraftChange(button.id, { label: e.target.value }); }} className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="min-w-0 text-sm font-medium text-slate-700">Destination
        <input value={url} onChange={(e) => { setUrl(e.target.value); onDraftChange(button.id, { destination_url: e.target.value }); }} className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2" placeholder="https://example.com" />
      </label>
    </div>
    <fieldset disabled={busy} className="mt-4 rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-sm font-semibold text-slate-700">Button Media</legend>
      <div className="flex gap-4">{["none", "icon", "upload"].map(mode => <label key={mode} className="flex items-center gap-1 text-sm capitalize">
        <input type="radio" name={`media-${button.id}`} value={mode} checked={mediaMode === mode} onChange={() => {
          setMediaMode(mode);
          onDraftChange(button.id, { icon_key: mode === "icon" ? iconKey : mode === "upload" ? button.icon_key : null, image_path: mode === "upload" ? button.image_path : null });
        }} />{mode === "none" ? "None" : mode === "icon" ? "Icon" : "Upload"}
      </label>)}</div>
      {mediaMode === "icon" && <label className="mt-3 block text-sm">Choose icon
        <select value={iconKey} onChange={e => { if (isSmartPageIconKey(e.target.value)) { setIconKey(e.target.value); onDraftChange(button.id, { icon_key: e.target.value, image_path: null }); } }} className="ml-2 rounded border border-slate-300 bg-white p-2">
          {Object.entries(SMART_PAGE_ICONS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
        </select>
      </label>}
      {mediaMode === "upload" && <div className="mt-3 space-y-2">
        <label className="block text-sm">Custom image (PNG, JPEG, WebP; max 4 MiB)
          <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setImageFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" />
        </label>
        <button type="button" disabled={!imageFile || busy} onClick={uploadImage} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">{button.image_path ? "Replace Image" : "Upload Image"}</button>
        <p className="text-xs text-slate-500">Uploads publish immediately. To remove media, choose None and Save Action.</p>
      </div>}
      <div className="mt-3 rounded-lg bg-white p-3 text-center text-sm">
        <ActionContent label={label} iconKey={mediaMode === "icon" ? iconKey : mediaMode === "upload" ? button.icon_key : null}
          imageSrc={mediaMode === "upload" && button.image_path ? `/api/plaques/${encodeURIComponent(plaqueId)}/smart-page/buttons/${encodeURIComponent(button.id)}/image?v=${encodeURIComponent(button.updated_at)}` : null} />
      </div>
    </fieldset>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className="mr-auto flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); onDraftChange(button.id, { enabled: e.target.checked }); }} /> Visible on Smart Page</label>
      <button type="button" disabled={busy || first} onClick={() => act("move_button", { direction: "up" })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">↑ Move Up</button>
      <button type="button" disabled={busy || last} onClick={() => act("move_button", { direction: "down" })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">↓ Move Down</button>
      <button type="button" disabled={busy} onClick={() => act("update_button", { label, destination_url: url, enabled, ...(mediaMode === "upload" ? {} : { icon_key: mediaMode === "icon" ? iconKey : null }) })} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save Action</button>
      <button type="button" disabled={busy} onClick={() => { if (window.confirm("Delete this action?")) void act("delete_button"); }} className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50">Delete</button>
    </div>
    <p className="mt-3 text-xs text-slate-500">Changes to the action name, destination, icon selection, or visibility go live after you click Save Action.</p>
    {message && <p role="status" className="mt-2 text-sm text-slate-600">{message}</p>}
  </div>;
}

export default function SmartPageEditor({ plaqueId, plaqueCode, initialMode, page, buttons }: { plaqueId: string; plaqueCode: string; initialMode: string; page: Page; buttons: Button[] }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [content, setContent] = useSmartPageDraft({ heading: page?.heading ?? "", subheading: page?.subheading ?? "" });
  const { heading, subheading } = content;
  const setHeading = (heading: string) => setContent(current => ({ ...current, heading }));
  const setSubheading = (subheading: string) => setContent(current => ({ ...current, subheading }));
  const [appearance, setAppearance] = useSmartPageDraft(normalizePresentation(page ?? {}));
  const [appearanceBusy, setAppearanceBusy] = useState(false);
  const [appearanceMessage, setAppearanceMessage] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  async function saveAppearance() {
    setAppearanceBusy(true); setAppearanceMessage("");
    try { await save(plaqueId, { action: "save_appearance", ...appearance }); setAppearanceMessage("Appearance saved."); router.refresh(); }
    catch (error) { setAppearanceMessage(error instanceof Error ? error.message : "Could not save appearance."); }
    finally { setAppearanceBusy(false); }
  }
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoMessage, setLogoMessage] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoPresent, setLogoPresent] = useState(!!page?.logo_path);
  const [logoVersion, setLogoVersion] = useState(page?.updated_at ?? "");
  const [previewButtons, setPreviewButtons] = useState(buttons);
  const logoInput = useRef<HTMLInputElement>(null);
  useEffect(() => { setMode(initialMode); }, [initialMode]);
  useEffect(() => { setLogoPresent(!!page?.logo_path); setLogoVersion(page?.updated_at ?? ""); }, [page?.logo_path, page?.updated_at]);
  const previousButtons = useRef(buttons);
  useEffect(() => {
    const previous = previousButtons.current; previousButtons.current = buttons;
    setPreviewButtons(current => mergeActionDrafts(current, previous, buttons));
  }, [buttons]);
  function onButtonDraftChange(id: string, patch: Partial<Button>) {
    setPreviewButtons((current) => current.map((button) => button.id === id ? { ...button, ...patch } : button));
  }
  async function act(body: Record<string, unknown>, success = "Changes saved.") {
    setBusy(true); setMessage("");
    try {
      await save(plaqueId, body);
      if (body.action === "set_mode") setMode(body.mode as string);
      if (body.action === "add_button") { setLabel(""); setUrl(""); setEnabled(true); }
      setMessage(success); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save changes."); }
    finally { setBusy(false); }
  }
  async function changeLogo(method: "POST" | "DELETE") {
    if (method === "POST" && !logoFile) { setLogoMessage("Choose an image first."); return; }
    setLogoBusy(true); setLogoMessage("");
    try {
      const body = new FormData();
      if (logoFile) body.set("logo", logoFile);
      const response = await fetch(`/api/plaques/${encodeURIComponent(plaqueId)}/smart-page/logo`, {
        method, body: method === "POST" ? body : undefined,
      });
      if (!response.ok) {
        const result: { error?: string } = await response.json();
        throw new Error(result.error || "Could not update the logo.");
      }
      setLogoFile(null);
      setLogoPresent(method === "POST");
      setLogoVersion(String(Date.now()));
      if (logoInput.current) logoInput.current.value = "";
      setLogoMessage(method === "POST" ? "Logo uploaded." : "Logo removed.");
      router.refresh();
    } catch (error) { setLogoMessage(error instanceof Error ? error.message : "Could not update the logo."); }
    finally { setLogoBusy(false); }
  }
  const usable = buttons.filter((button) => {
    if (!button.enabled) return false;
    try { const parsed = new URL(button.destination_url); return parsed.protocol === "http:" || parsed.protocol === "https:"; }
    catch { return false; }
  });
  return <>
    <section className="mt-6 mt-panel min-w-0 p-5 sm:p-6" aria-labelledby="customer-destination-heading">
      <h2 id="customer-destination-heading" className="text-xl font-bold text-[#17324d]">Customer Destination</h2>
      <p className="mt-2 text-sm text-slate-500">Choose what customers see when they tap this plaque.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {([
          { value: "direct_link", title: "Direct Link", description: "Send customers straight to one website, menu, review page, or other destination." },
          { value: "smart_page", title: "Smart Page", description: "Create a custom ModernTap page with your branding and multiple customer actions." },
        ] as const).map(({ value, title, description }) => (
          <button key={value} type="button" disabled={busy || mode === value} aria-pressed={mode === value}
            onClick={() => act({ action: "set_mode", mode: value }, `${title} enabled.`)}
            className={`min-w-0 rounded-xl border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0] ${busy ? "opacity-60" : ""} ${mode === value ? "border-[#0f8f8a] bg-[#dffaf8]" : "border-[#dbe4ea] bg-white hover:border-[#0f8f8a]"}`}>
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-[#17324d]">{title}</span>
              {mode === value && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0f8f8a]">Currently Live</span>}
            </span>
            <span className="mt-3 block text-sm leading-6 text-slate-600">{description}</span>
          </button>
        ))}
      </div>
      {message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
    </section>
    {mode === "smart_page" && <section className="mt-6 mt-panel min-w-0 p-5 sm:p-6" aria-labelledby="smart-page-builder-heading">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="mt-kicker">Smart Page Builder</p>
          <h2 id="smart-page-builder-heading" className="mt-2 text-xl font-bold text-[#17324d] sm:text-2xl">Build your customer experience</h2>
          <p className="mt-2 text-sm text-slate-500">Customize the page customers see after tapping this plaque.</p>
        </div>
        <div>
          <a href={`/s/${encodeURIComponent(plaqueCode)}`} target="_blank" rel="noopener noreferrer" className="mt-secondary-action">Open Live Smart Page ↗</a>
          <p className="mt-2 text-xs text-slate-500">Preview the currently published customer experience.</p>
        </div>
      </div>
      <dl className="mt-6 grid gap-4 rounded-xl bg-[#f3f7f9] p-4 sm:grid-cols-3">
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt><dd className="mt-1 font-semibold text-[#17324d]">{mode === "smart_page" && usable.length > 0 ? "Live" : "Needs Setup"}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer Actions</dt><dd className="mt-1 font-semibold text-[#17324d]">{usable.length} visible</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branding</dt><dd className="mt-1 font-semibold text-[#17324d]">{logoPresent ? "Logo Added" : "No Logo"}</dd></div>
      </dl>
      <p className="mt-2 text-xs text-slate-500">Status reflects saved settings. Unsaved edits appear only in the preview.</p>
      {usable.length === 0 && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Add at least one visible customer action with a valid website address. Until then, customers may be sent to this plaque&apos;s Direct Link destination when available.</p>}
      {usable.length > 0 && usable.length < buttons.filter((button) => button.enabled).length && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">One or more visible customer actions have an invalid destination and will not appear on the live Smart Page.</p>}

      <button type="button" className="mt-secondary-action mt-5 xl:hidden" aria-expanded={showPreview} aria-controls="smart-page-preview" onClick={() => setShowPreview(value => !value)}>{showPreview ? "Hide Preview" : "Show Preview"}</button>
      <div className="mt-6 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_350px]">
      <div className="min-w-0">
      <section className="mt-7 rounded-xl border border-[#dbe4ea] p-4 sm:p-5" aria-labelledby="branding-heading">
        <h3 id="branding-heading" className="text-lg font-bold text-[#17324d]">Branding</h3>
        <p className="mt-1 text-sm text-slate-500">Add your business logo to personalize the Smart Page.</p>
        <p id="logo-guidance" className="mt-2 text-xs text-slate-500">PNG, JPEG, or WebP. Maximum 4 MB.</p>
        {logoPresent && <p className="mt-2 text-sm text-slate-700">Your business logo is currently displayed on the Smart Page.</p>}
        <label className="mt-4 block text-sm font-medium text-slate-700">Business Logo
          <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" disabled={logoBusy} aria-describedby="logo-guidance" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full min-w-0 text-sm text-slate-700" />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={logoBusy || !logoFile} onClick={() => changeLogo("POST")} className="mt-primary-action disabled:opacity-50">{logoPresent ? "Replace Logo" : "Upload Logo"}</button>
          {logoPresent && <button type="button" disabled={logoBusy} onClick={() => changeLogo("DELETE")} className="mt-secondary-action disabled:opacity-50">Remove Logo</button>}
        </div>
        {logoMessage && <p role="status" className="mt-3 text-sm text-slate-600">{logoMessage}</p>}
        <h4 id="page-content-heading" className="mt-6 text-sm font-bold text-[#17324d]">Page Content</h4>
        <p className="mt-1 text-sm text-slate-500">Add a short message customers will see when they open your Smart Page.</p>
        <div className="mt-5 grid gap-4">
          <label className="min-w-0 text-sm font-medium text-slate-700">Page Heading <span className="font-normal text-slate-500">(optional)</span>
            <input value={heading} maxLength={100} onChange={(e) => setHeading(e.target.value)} aria-describedby="page-heading-help" className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2" />
            <span id="page-heading-help" className="mt-2 block text-xs font-normal text-slate-500">Example: Welcome to Lorenzo&apos;s</span>
          </label>
          <label className="min-w-0 text-sm font-medium text-slate-700">Page Message <span className="font-normal text-slate-500">(optional)</span>
            <textarea value={subheading} maxLength={240} onChange={(e) => setSubheading(e.target.value)} rows={3} aria-describedby="page-message-help" className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2" />
            <span id="page-message-help" className="mt-2 block text-xs font-normal text-slate-500">Example: Choose an option below to view our menu, leave a review, or follow us.</span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy} onClick={() => act({ action: "save_page", heading, subheading })} className="mt-primary-action disabled:opacity-50">Save Page Content</button>
          <p className="text-xs text-slate-500">Save your changes to update the live Smart Page.</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Logo size<select value={appearance.logo_size ?? "medium"} onChange={e => setAppearance(current => ({ ...current, presentation_version: 2, logo_size: e.target.value as Layout["logo_size"] }))} className="mt-1 block w-full rounded border p-2"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
          <label className="text-sm">Content alignment<select value={appearance.content_alignment ?? "center"} onChange={e => setAppearance(current => ({ ...current, presentation_version: 2, content_alignment: e.target.value as Layout["content_alignment"] }))} className="mt-1 block w-full rounded border p-2"><option value="center">Center</option><option value="left">Left</option></select></label>
        </div>
        <p className="mt-2 text-xs text-slate-500">Size and alignment preview the V2 layout. Publish them with Save V2 Appearance below. Logo uploads and removals publish immediately.</p>
      </section>

      <AppearanceEditor draft={appearance} onChange={patch => { setAppearance(current => ({ ...current, ...patch })); setAppearanceMessage(""); }}
        onSave={saveAppearance} onReset={() => { setAppearance(normalizePresentation(page ?? {})); setAppearanceMessage(""); }} saving={appearanceBusy} message={appearanceMessage} />

      <section className="mt-8 min-w-0 border-t border-slate-200 pt-7" aria-labelledby="customer-actions-heading">
        <h3 id="customer-actions-heading" className="text-lg font-bold text-[#17324d]">Customer Actions</h3>
        <p className="mt-1 text-sm text-slate-500">Add the actions you want customers to take from your Smart Page.</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">Examples: View Menu, Leave a Review, Order Online, Follow on Instagram, Book Appointment, or Visit Website.</p>
        <div className="mt-4 space-y-3">{buttons.map((button, index) => <ButtonRow key={button.id} plaqueId={plaqueId} button={button} first={index === 0} last={index === buttons.length - 1} onDraftChange={onButtonDraftChange} />)}</div>
        <div className="mt-6 rounded-xl border border-[#dbe4ea] p-4 sm:p-5">
          <h4 className="font-semibold text-[#17324d]">Add Customer Action</h4>
          <p className="mt-1 text-sm text-slate-500">Create another option for customers on this Smart Page. After adding it, choose an optional icon or image.</p>
          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="min-w-0 text-sm font-medium text-slate-700">Action Name<input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder="View Menu" className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2" /></label>
            <label className="min-w-0 text-sm font-medium text-slate-700">Destination<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2" /></label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Visible on Smart Page</label>
          <button type="button" disabled={busy} onClick={() => act({ action: "add_button", label, destination_url: url, enabled }, "Action added.")} className="mt-primary-action mt-4 disabled:opacity-50">Add Action</button>
        </div>
      </section>
      </div>
      <div id="smart-page-preview" className={`${showPreview ? "block" : "hidden"} min-w-0 xl:block`}>
        <SmartPagePreview heading={heading} subheading={subheading} appearance={resolvePresentation(appearance)}
          logoSrc={logoPresent ? `/api/plaques/${encodeURIComponent(plaqueId)}/smart-page/logo?v=${encodeURIComponent(logoVersion)}` : null}
          actions={previewButtons.filter(button => { if (!button.enabled) return false; try { const url = new URL(button.destination_url); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; } }).map(button => ({
            id: button.id, label: button.label, href: "", iconKey: button.icon_key,
            imageSrc: button.image_path ? `/api/plaques/${encodeURIComponent(plaqueId)}/smart-page/buttons/${encodeURIComponent(button.id)}/image?v=${encodeURIComponent(button.updated_at)}` : null,
          }))} />
      </div>
      </div>
    </section>}
  </>;
}
