"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DESIGN_REQUEST_STATUSES, type DesignRequestStatus } from "@/lib/design-requests";

export default function DesignRequestActions({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState<DesignRequestStatus>(status as DesignRequestStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/design-requests", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update status.");
      setMessage("Status saved."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update status."); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 flex flex-wrap items-center gap-2">
    <select value={value} onChange={(event) => setValue(event.target.value as DesignRequestStatus)} aria-label="Design request status" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
      {DESIGN_REQUEST_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
    </select>
    <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save Status"}</button>
    {message && <span role="status" className="text-xs text-slate-600">{message}</span>}
  </div>;
}
