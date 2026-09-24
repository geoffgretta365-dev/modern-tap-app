"use client";
import { useState } from "react";
import Link from "next/link";
export default function ChangePlanButton({ planKey, name }: { planKey: string; name: string }) {
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function upgrade() {
    setBusy(true);
    try {
      const r = await fetch("/api/stripe/change-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planKey }) });
      const result = await r.json(); setMessage(result.error ?? result.message);
    } catch { setMessage("Connection interrupted. Check Billing before trying again."); }
    finally { setBusy(false); }
  }
  return <div className="mt-5">{message ? <div role="status"><p className="text-sm">{message}</p><Link href="/billing" className="mt-secondary-action mt-3">Check Billing</Link></div> : confirm ? <><p className="mb-3 text-sm text-slate-600">Stripe will invoice the prorated difference immediately using your payment method. Your renewal date stays the same. Trial subscriptions retain their trial terms.</p><button disabled={busy} onClick={upgrade} className="mt-primary-action">{busy ? "Updating…" : `Confirm Upgrade to ${name}`}</button><button disabled={busy} onClick={() => setConfirm(false)} className="mt-3 block text-sm underline">Cancel</button></> : <button onClick={() => setConfirm(true)} className="mt-primary-action">Upgrade to {name}</button>}</div>;
}
