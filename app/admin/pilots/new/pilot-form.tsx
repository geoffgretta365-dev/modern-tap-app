"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const inputClass = "mt-2 block min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900";

export function NewPilotForm({ today }: { today: string }) {
  const router = useRouter();
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/pilots", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"), startDate: form.get("startDate"), days: Number(form.get("days")),
          reviews: form.get("reviews") === "" ? null : Number(form.get("reviews")),
          rating: form.get("rating") === "" ? null : Number(form.get("rating")), notes: form.get("notes"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create pilot.");
      router.push(`/admin/businesses/${encodeURIComponent(result.id)}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create pilot.");
      pending.current = false;
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5">
    <label className="block text-sm font-medium text-slate-700">Business name
      <input name="name" required maxLength={100} className={inputClass} placeholder="Lorenzo’s (Pilot)" />
    </label>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block min-w-0 text-sm font-medium text-slate-700">Trial start date
        <input type="date" name="startDate" required defaultValue={today} className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-slate-700">Trial length (days)
        <input type="number" name="days" required min={1} max={365} step={1} defaultValue={30} className={inputClass} />
      </label>
    </div>
    <fieldset>
      <legend className="text-sm font-semibold text-slate-900">Starting Google reviews</legend>
      <p className="mt-1 text-xs leading-5 text-slate-500">Optional baseline for comparing results after the pilot.</p>
      <div className="mt-3 grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">Review count
          <input type="number" name="reviews" min={0} max={2147483647} step={1} className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-slate-700">Star rating
          <input type="number" name="rating" min={1} max={5} step="0.01" className={inputClass} />
        </label>
      </div>
    </fieldset>
    <label className="block text-sm font-medium text-slate-700">Notes (optional)
      <textarea name="notes" maxLength={5000} rows={4} className={inputClass} />
    </label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={saving} className="min-h-11 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
      {saving ? "Creating pilot…" : "Create pilot"}
    </button>
  </form>;
}
