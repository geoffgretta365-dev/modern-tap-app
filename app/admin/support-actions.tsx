"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  ticketId: string;
  currentStatus: string;
};

export default function SupportActions({
  ticketId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function saveChanges() {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/admin/support", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticketId,
        status,
      }),
    });

    if (!response.ok) {
      setMessage("Could not update this ticket.");
      setLoading(false);
      return;
    }

    setMessage("Support ticket updated.");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <p className="text-sm font-semibold text-slate-900">
        Manage Ticket
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

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