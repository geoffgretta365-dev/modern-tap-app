"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Button = { id: string; label: string; destination_url: string; enabled: boolean; position: number };
type Page = { heading: string | null; subheading: string | null; logo_path: string | null } | null;

async function save(plaqueId: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/plaques/${encodeURIComponent(plaqueId)}/smart-page`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!response.ok) {
    const result: { error?: string } = await response.json();
    throw new Error(result.error || "Could not save changes.");
  }
}

function ButtonRow({ plaqueId, button, first, last }: { plaqueId: string; button: Button; first: boolean; last: boolean }) {
  const router = useRouter();
  const [label, setLabel] = useState(button.label);
  const [url, setUrl] = useState(button.destination_url);
  const [enabled, setEnabled] = useState(button.enabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setLabel(button.label); setUrl(button.destination_url); setEnabled(button.enabled); }, [button]);
  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setMessage("");
    try {
      await save(plaqueId, { action, buttonId: button.id, ...extra });
      setMessage(action === "update_button" ? "Button saved." : "");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save changes."); }
    finally { setBusy(false); }
  }
  return <div className="rounded-xl border border-slate-200 p-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium text-slate-700">Label
        <input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="text-sm font-medium text-slate-700">Destination URL
        <input value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="https://example.com" />
      </label>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className="mr-auto flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled</label>
      <button type="button" disabled={busy || first} onClick={() => act("move_button", { direction: "up" })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">↑ Up</button>
      <button type="button" disabled={busy || last} onClick={() => act("move_button", { direction: "down" })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">↓ Down</button>
      <button type="button" disabled={busy} onClick={() => act("update_button", { label, destination_url: url, enabled })} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
      <button type="button" disabled={busy} onClick={() => { if (window.confirm("Delete this button?")) void act("delete_button"); }} className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50">Delete</button>
    </div>
    {message && <p role="status" className="mt-2 text-sm text-slate-600">{message}</p>}
  </div>;
}

export default function SmartPageEditor({ plaqueId, plaqueCode, initialMode, page, buttons }: { plaqueId: string; plaqueCode: string; initialMode: string; page: Page; buttons: Button[] }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [heading, setHeading] = useState(page?.heading ?? "");
  const [subheading, setSubheading] = useState(page?.subheading ?? "");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoMessage, setLogoMessage] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoPresent, setLogoPresent] = useState(!!page?.logo_path);
  const logoInput = useRef<HTMLInputElement>(null);
  useEffect(() => { setMode(initialMode); setHeading(page?.heading ?? ""); setSubheading(page?.subheading ?? ""); setLogoPresent(!!page?.logo_path); }, [initialMode, page]);
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
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Destination Mode</p>
      <p className="mt-2 text-sm text-slate-500">Choose what customers see when they tap this plaque.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {([ ["direct_link", "Direct Link"], ["smart_page", "Smart Page"] ] as const).map(([value, title]) =>
          <button key={value} type="button" disabled={busy || mode === value} onClick={() => act({ action: "set_mode", mode: value }, `${title} enabled.`)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-70 ${mode === value ? "bg-slate-950 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}>{title}</button>)}
      </div>
      {message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
    </section>
    {mode === "smart_page" && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">Smart Page</h2>
      <a href={`/s/${encodeURIComponent(plaqueCode)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-slate-700 underline hover:text-slate-950">Preview Smart Page ↗</a>
      <div className="mt-6 rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-950">Business Logo</h3>
        <p className="mt-1 text-sm text-slate-500">PNG, JPEG, or WebP. Maximum 4 MB.</p>
        {logoPresent && <p className="mt-2 text-sm text-slate-700">A logo is currently displayed on your Smart Page.</p>}
        <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} className="mt-3 block w-full text-sm text-slate-700" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={logoBusy || !logoFile} onClick={() => changeLogo("POST")} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{logoPresent ? "Replace Logo" : "Upload Logo"}</button>
          {logoPresent && <button type="button" disabled={logoBusy} onClick={() => changeLogo("DELETE")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Remove Logo</button>}
        </div>
        {logoMessage && <p role="status" className="mt-3 text-sm text-slate-600">{logoMessage}</p>}
      </div>
      {usable.length === 0 && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Add and enable a button with a valid website URL. Until then, visitors are sent to the saved Direct Link destination when available.</p>}
      {usable.length > 0 && usable.length < buttons.filter((button) => button.enabled).length && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Some enabled buttons have invalid destinations and will not appear publicly.</p>}
      <div className="mt-5 grid gap-4">
        <label className="text-sm font-medium text-slate-700">Heading (optional)<input value={heading} maxLength={100} onChange={(e) => setHeading(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm font-medium text-slate-700">Subheading (optional)<textarea value={subheading} maxLength={240} onChange={(e) => setSubheading(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      </div>
      <button type="button" disabled={busy} onClick={() => act({ action: "save_page", heading, subheading })} className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save Smart Page</button>
      <h3 className="mt-8 text-lg font-bold text-slate-950">Buttons</h3>
      <div className="mt-4 space-y-3">{buttons.map((button, index) => <ButtonRow key={button.id} plaqueId={plaqueId} button={button} first={index === 0} last={index === buttons.length - 1} />)}</div>
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h4 className="text-sm font-semibold text-slate-950">Add Button</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Label<input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-slate-700">Destination URL<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled</label>
        <button type="button" disabled={busy} onClick={() => act({ action: "add_button", label, destination_url: url, enabled }, "Button added.")} className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add Button</button>
      </div>
    </section>}
  </>;
}
