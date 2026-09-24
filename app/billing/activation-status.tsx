"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ACTIVATION_ATTEMPTS, ACTIVATION_DELAY_MS } from "@/lib/stripe/activation";

export default function ActivationStatus({ initiallyActive }: { initiallyActive: boolean }) {
  const [state, setState] = useState<"waiting" | "active" | "delayed" | "error">(initiallyActive ? "active" : "waiting");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (initiallyActive) { setState("active"); return; }
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let abortTimer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    let attempts = 0;
    setState("waiting");
    async function check() {
      attempts++;
      controller = new AbortController();
      abortTimer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch("/api/billing/status", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Could not check activation");
        const result = await response.json();
        if (disposed) return;
        if (result.active === true) { setState("active"); return; }
        if (attempts >= ACTIVATION_ATTEMPTS) { setState("delayed"); return; }
        timer = setTimeout(check, ACTIVATION_DELAY_MS);
      } catch {
        if (!disposed) setState("error");
      } finally { clearTimeout(abortTimer); }
    }
    void check();
    return () => { disposed = true; clearTimeout(timer); clearTimeout(abortTimer); controller?.abort(); };
  }, [initiallyActive, retry]);
  return <section className="mt-6 rounded-2xl border border-[#b7e8e4] bg-[#eafaf7] p-5 sm:p-6" aria-live="polite">
    <h2 className="text-xl font-bold text-[#17324d]">{state === "active" ? "Your ModernTap account is ready." : state === "waiting" ? "Setting up your ModernTap account…" : state === "delayed" ? "Your subscription is still being confirmed." : "We couldn’t check activation."}</h2>
    <p className="mt-2 text-sm text-slate-600">{state === "active" ? "Your subscription is confirmed. You can now manage your plaques." : state === "waiting" ? "Waiting for payment confirmation. This usually takes a moment." : "Please check again shortly. You don’t need to make another payment."}</p>
    {state === "active" ? <Link href="/dashboard" className="mt-primary-action mt-4">Open ModernTap</Link> : state !== "waiting" && <button type="button" onClick={() => setRetry(value=>value+1)} className="mt-primary-action mt-4">Check Again</button>}
  </section>;
}
