"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { placements } from "@/lib/pilot-input";

const inputClass = "mt-2 block min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900";

export function AddPilotPlaquesForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/businesses/${encodeURIComponent(businessId)}/plaques`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), placement: form.get("placement"), destination: form.get("destination"), quantity: Number(form.get("quantity")) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add plaques.");
      setMessage(`${result.plaques.length} plaque${result.plaques.length === 1 ? "" : "s"} added. Copy the tap URLs below to program your tags.`);
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not add plaques."); }
    finally { pending.current = false; setSaving(false); }
  }

  return <form onSubmit={submit} className="mt-5 space-y-4">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
      <label className="block text-sm font-medium text-slate-700">Plaque name
        <input name="name" required maxLength={100} placeholder="Table" className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-slate-700">Placement
        <select name="placement" defaultValue="table" className={inputClass}>{placements.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select>
      </label>
      <label className="block text-sm font-medium text-slate-700">Quantity
        <input name="quantity" type="number" required min={1} max={30} step={1} defaultValue={1} className={inputClass} />
      </label>
    </div>
    <label className="block text-sm font-medium text-slate-700">Destination URL
      <input name="destination" type="url" required maxLength={2048} placeholder="https://g.page/r/…/review" className={inputClass} />
    </label>
    <p className="text-xs leading-5 text-slate-500">Each plaque gets a unique tap URL. Batches are numbered, for example Table 1 through Table 12.</p>
    <button disabled={saving} className="min-h-11 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Adding plaques…" : "Add plaques"}</button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <p role="status" className="text-sm text-slate-600">{message}</p>
  </form>;
}

export function PlaqueTapUrl({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage("Copied."); }
    catch { setMessage("Copy unavailable. Select and copy the URL above."); }
  }
  return <div className="mt-3">
    <p className="select-all break-all font-mono text-xs leading-5 text-slate-700">{url}</p>
    <div className="mt-1 flex flex-wrap items-center gap-x-3">
      <button type="button" onClick={copy} aria-label={`Copy tap URL ${url}`} className="min-h-11 text-sm font-semibold text-teal-700 underline underline-offset-2">Copy tap URL</button>
      <span role="status" className="text-xs text-slate-600">{message}</span>
    </div>
  </div>;
}

export function RefreshPilotActivity() {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  return <button type="button" disabled={refreshing} onClick={() => startTransition(() => router.refresh())}
    className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
    {refreshing ? "Refreshing…" : "Refresh activity"}
  </button>;
}
