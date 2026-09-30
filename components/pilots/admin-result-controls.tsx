"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const buttonClass = "min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50";

export function PilotShareControls({ businessId, initialUrl }: { businessId: string; initialUrl: string | null }) {
  const router = useRouter();
  const pending = useRef(false);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function change(method: "POST" | "DELETE") {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/pilots/${encodeURIComponent(businessId)}/share`, { method });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not change share link.");
      setUrl(method === "DELETE" ? null : data.url);
      setMessage(method === "DELETE" ? "Link turned off. The old link no longer works." : "Share link ready.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not change share link."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setMessage("Link copied."); }
    catch { setMessage("Select and copy the URL above."); }
  }
  return <div className="mt-5 border-t border-slate-200 pt-5">
    <h3 className="font-semibold text-slate-900">Owner live results</h3>
    <p className="mt-2 text-sm leading-6 text-slate-600">Anyone with this link can view pilot results without signing in. Turn it off to stop sharing.</p>
    {url && <p className="mt-3 select-all break-all rounded-lg bg-slate-50 p-3 font-mono text-xs leading-5">{url}</p>}
    <div className="mt-3 flex flex-wrap gap-3">
      {url ? <><button type="button" disabled={busy} onClick={copy} className={buttonClass}>Copy link</button><button type="button" disabled={busy} onClick={() => change("DELETE")} className={buttonClass}>Turn off link</button></> : <button type="button" disabled={busy} onClick={() => change("POST")} className={buttonClass}>{busy ? "Creating…" : "Create share link"}</button>}
    </div>
    <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>
  </div>;
}

export function PilotReviewForm({ businessId, reviews, rating }: { businessId: string; reviews: number | null; rating: number | null }) {
  const router = useRouter();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/pilots/${encodeURIComponent(businessId)}/results`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: form.get("reviews") === "" ? null : Number(form.get("reviews")), rating: form.get("rating") === "" ? null : Number(form.get("rating")) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save results.");
      setMessage("Review results saved."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save results."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-4 space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">Ending Google review count
        <input name="reviews" type="number" min={0} max={2147483647} step={1} defaultValue={reviews ?? ""} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm font-medium text-slate-700">Ending star rating
        <input name="rating" type="number" min={1} max={5} step="0.01" defaultValue={rating ?? ""} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2" />
      </label>
    </div>
    <button disabled={busy} className={buttonClass}>{busy ? "Saving…" : "Save review results"}</button>
    <p role="status" className="text-sm text-slate-600">{message}</p>
  </form>;
}
