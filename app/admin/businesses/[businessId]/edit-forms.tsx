"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function submitUpdate(path: string, body: object) {
  const response = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Update failed");
}

export function EditBusinessForm({ businessId, name: initialName }: {
  businessId: string;
  name: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await submitUpdate(`/api/admin/businesses/${encodeURIComponent(businessId)}`, { name });
      setMessage("Business updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
        Business name
        <input className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900"
          value={name} onChange={(event) => setName(event.target.value)}
          maxLength={100} required />
      </label>
      <button disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {saving ? "Saving…" : "Save Business"}
      </button>
      {message ? <p role="status" className="w-full text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}

export function EditPlaqueForm({ businessId, plaqueId, initialName, initialDestination }: {
  businessId: string;
  plaqueId: string;
  initialName: string;
  initialDestination: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [destination, setDestination] = useState(initialDestination ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await submitUpdate(
        `/api/admin/businesses/${encodeURIComponent(businessId)}/plaques/${encodeURIComponent(plaqueId)}`,
        { name, destination_url: destination }
      );
      setMessage("Plaque updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        Plaque name
        <input className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900"
          value={name} onChange={(event) => setName(event.target.value)}
          maxLength={100} required />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Destination URL
        <input className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900"
          type="text" value={destination} onChange={(event) => setDestination(event.target.value)} required />
      </label>
      <button disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {saving ? "Saving…" : "Save Plaque"}
      </button>
      {message ? <p role="status" className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
