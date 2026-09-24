"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function DesignRequestForm({ plaques }: { plaques: { id: string; name: string }[] }) {
  const router = useRouter();
  const [plaqueId, setPlaqueId] = useState("");
  const [notes, setNotes] = useState("");
  const [inspirationUrl, setInspirationUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || plaques.length === 0) return;
    setBusy(true); setMessage(""); setSuccess(false);
    try {
      const response = await fetch("/api/design-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaqueId, notes, inspirationUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit the request.");
      setPlaqueId(""); setNotes(""); setInspirationUrl(""); setSuccess(true);
      setMessage("Design request submitted. You can track its status below.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not submit the request."); }
    finally { setBusy(false); }
  }

  return <section className="mt-panel min-w-0 p-5 sm:p-6">
    <h2 className="text-lg font-bold text-[#17324d]">Request a Design Change</h2>
    <p className="mt-1 text-sm text-slate-500">Tell us what you would like updated. Your current plaque will continue working while the request is reviewed.</p>
    {plaques.length === 0 && <div className="mt-5 rounded-xl bg-[#f3f7f9] p-4 text-sm text-slate-600">
      <p>You need at least one plaque in your account before submitting a design request.</p>
      <Link href="/plaques" className="mt-secondary-action mt-3">View My Plaques</Link>
    </div>}
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block text-sm font-semibold text-slate-700">Plaque to Update <span className="font-normal text-slate-500">(required)</span>
        <select value={plaqueId} onChange={(event) => setPlaqueId(event.target.value)} required aria-describedby="plaque-help" className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-[#dbe4ea] bg-white px-3 py-3 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]">
          <option value="">Select a plaque</option>
          {plaques.map((plaque) => <option key={plaque.id} value={plaque.id}>{plaque.name}</option>)}
        </select>
        <span id="plaque-help" className="mt-2 block text-xs font-normal leading-5 text-slate-500">Choose the physical plaque this design request applies to.</span>
      </label>
      <label className="block text-sm font-semibold text-slate-700">What would you like changed? <span className="font-normal text-slate-500">(required)</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} required maxLength={2000} rows={6} aria-describedby="notes-help" placeholder="Example: Keep the same layout, change the background to black, make our logo larger, and update the text to 'Tap to View Our Menu.'" className="mt-2 w-full min-w-0 max-w-full resize-y rounded-xl border border-[#dbe4ea] bg-white px-3 py-3 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]" />
      </label>
      <div className="-mt-3 flex flex-wrap justify-between gap-2 text-xs leading-5 text-slate-500">
        <p id="notes-help" className="min-w-0 flex-1">Include any colors, wording, logo placement, or layout changes you have in mind.</p>
        <span className="shrink-0 tabular-nums">{notes.length} / 2000</span>
      </div>
      <label className="block text-sm font-semibold text-slate-700">Reference Link <span className="font-normal text-slate-500">(optional)</span>
        <input type="url" aria-describedby="reference-help" value={inspirationUrl} onChange={(event) => setInspirationUrl(event.target.value)} maxLength={2048} placeholder="https://example.com" className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-[#dbe4ea] bg-white px-3 py-3 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]" />
        <span id="reference-help" className="mt-2 block text-xs font-normal leading-5 text-slate-500">Optional: Share a website, image link, or other reference that helps explain the look you want.</span>
      </label>
      <button type="submit" disabled={busy || plaques.length === 0} className="mt-primary-action disabled:opacity-50">{busy ? "Sending Request..." : "Send Design Request"}</button>
      {message && <p role="status" className={`text-sm ${success ? "text-[#0f8f8a]" : "text-red-700"}`}>{message}</p>}
    </form>
  </section>;
}
