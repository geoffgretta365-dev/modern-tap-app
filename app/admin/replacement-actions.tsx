"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  requestId: string;
  currentStatus: string;
  currentTrackingNumber?: string | null;
  currentTrackingUrl?: string | null;
};

export default function ReplacementActions({
  requestId,
  currentStatus,
  currentTrackingNumber,
  currentTrackingUrl,
}: Props) {
  const router = useRouter();

  const [status, setStatus] = useState(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState(
    currentTrackingNumber ?? ""
  );
  const [trackingUrl, setTrackingUrl] = useState(
    currentTrackingUrl ?? ""
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function saveChanges() {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/admin/replacements", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        status,
        trackingNumber: trackingNumber.trim(),
        trackingUrl: trackingUrl.trim(),
      }),
    });

    if (!response.ok) {
      setMessage("Could not update this request.");
      setLoading(false);
      return;
    }

    setMessage("Replacement updated.");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <p className="text-sm font-semibold text-slate-900">
        Manage Request
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
        >
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
        </select>

        <input
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          placeholder="Tracking number"
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500"
        />

        <input
          value={trackingUrl}
          onChange={(event) => setTrackingUrl(event.target.value)}
          placeholder="Tracking link (optional)"
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500"
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={saveChanges}
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>

        {message ? (
          <p className="text-sm text-slate-600">{message}</p>
        ) : null}
      </div>
    </div>
  );
}