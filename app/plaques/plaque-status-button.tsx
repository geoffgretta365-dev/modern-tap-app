"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
export default function PlaqueStatusButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function change() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/plaques/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) });
      const data = await response.json();
      if (!response.ok) setMessage(data.error ?? "Could not change status.");
      else router.refresh();
    } catch { setMessage("Connection interrupted. Refresh before trying again."); }
    finally { setBusy(false); }
  }
  return <div className="mt-5"><button type="button" className="mt-secondary-action" disabled={busy} onClick={change}>{busy ? "Saving…" : active ? "Deactivate Plaque" : "Reactivate Plaque"}</button><p className="mt-2 text-xs text-slate-500">Deactivation stops new taps. Your history, design, and destinations are kept.</p>{message && <div role="status" className="mt-3 text-sm"><p>{message}</p><Link href="/billing/change-plan" className="text-[#0f766e] underline">Review allowance / upgrade</Link></div>}</div>;
}
