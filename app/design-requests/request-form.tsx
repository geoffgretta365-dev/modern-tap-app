"use client";

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
    setBusy(true); setMessage(""); setSuccess(false);
    try {
      const response = await fetch("/api/design-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaqueId, notes, inspirationUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit the request.");
      setPlaqueId(""); setNotes(""); setInspirationUrl(""); setSuccess(true);
      setMessage("Your design request has been submitted.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not submit the request."); }
    finally { setBusy(false); }
  }

  return <section className="mt-panel min-w-0 p-5 sm:p-6">
    <h2 className="text-lg font-bold text-[#17324d]">Request a new design</h2>
    <p className="mt-1 text-sm text-slate-500">Your current plaque will continue working while the new design is prepared.</p>
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block text-sm font-semibold text-slate-700">Plaque
        <select value={plaqueId} onChange={(event) => setPlaqueId(event.target.value)} required className="mt-2 w-full rounded-xl border border-[#dbe4ea] bg-white px-3 py-3 text-slate-900">
          <option value="">Select a plaque</option>
          {plaques.map((plaque) => <option key={plaque.id} value={plaque.id}>{plaque.name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold text-slate-700">Design notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} required maxLength={2000} rows={6} placeholder="Describe the design changes you would like." className="mt-2 w-full resize-y rounded-xl border border-[#dbe4ea] bg-white px-3 py-3 text-slate-900" />
      </label>
      <label className="block text-sm font-semibold text-slate-700">Inspiration URL <span className="font-normal text-slate-500">(optional)</span>
        <input type="url" value={inspirationUrl} onChange={(event) => setInspirationUrl(event.target.value)} maxLength={2048} placeholder="https://example.com" className="mt-2 w-full rounded-xl border border-[#dbe4ea] bg-white px-3 py-3 text-slate-900" />
      </label>
      <button type="submit" disabled={busy || plaques.length === 0} className="mt-primary-action disabled:opacity-50">{busy ? "Submitting..." : "Submit Design Request"}</button>
      {message && <p role="status" className={`text-sm ${success ? "text-[#0f8f8a]" : "text-red-700"}`}>{message}</p>}
    </form>
  </section>;
}
