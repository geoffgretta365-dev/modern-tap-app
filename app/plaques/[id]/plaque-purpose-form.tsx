"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PlaquePurposeForm({ plaqueId, initialPurpose }: {
  plaqueId: string; initialPurpose: string;
}) {
  const router = useRouter();
  const [purpose, setPurpose] = useState(initialPurpose);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/plaques/${encodeURIComponent(plaqueId)}/purpose`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save plaque purpose.");
      setMessage("Plaque purpose saved."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save plaque purpose."); }
    finally { setBusy(false); }
  }
  return <section className="mt-panel mt-6 p-5 sm:p-6">
    <p className="mt-kicker">Plaque Purpose</p>
    <h2 className="mt-2 text-lg font-bold text-[#17324d]">What is this plaque for?</h2>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <select value={purpose} onChange={(event) => setPurpose(event.target.value)} aria-label="Plaque purpose" className="rounded-xl border border-[#dbe4ea] bg-white px-3 py-2.5 text-sm">
        <option value="general">General</option>
        <option value="review">Review Card</option>
      </select>
      <button type="button" disabled={busy || purpose === initialPurpose} onClick={save} className="mt-primary-action disabled:opacity-50">{busy ? "Saving..." : "Save Purpose"}</button>
    </div>
    {purpose === "review" && <p className="mt-3 text-sm text-slate-600">Review Card taps are tracked as review-page visits. ModernTap does not count them as completed reviews unless a review integration is connected.</p>}
    {message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
  </section>;
}
