"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPlaqueForm() {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState<"general" | "review">("general");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const router = useRouter();

  async function createPlaque(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setMessage("");

    if (!name.trim() || !destination.trim()) {
      setMessage("Enter a plaque name and destination.");
      setSaving(false);
      return;
    }

    let cleanUrl = destination.trim();

    if (
      !cleanUrl.startsWith("http://") &&
      !cleanUrl.startsWith("https://")
    ) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      new URL(cleanUrl);
    } catch {
      setMessage("Enter a valid destination URL.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/plaques", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), destination: cleanUrl, purpose }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Could not create the plaque."); setSaving(false); return; }
    } catch { setMessage("Could not connect. Refresh before trying again."); setSaving(false); return; }

    router.push("/plaques");
    router.refresh();
  }

  return (
    <form onSubmit={createPlaque} className="mt-8 space-y-5">
      <div>
        <label className="text-sm font-medium text-slate-700">
          Plaque Name
        </label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Front Counter Review Plaque"
          className="mt-2 w-full rounded-xl border border-[#dbe4ea] bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#16c7c0]"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">
          Destination URL
        </label>

        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="https://..."
          className="mt-2 w-full rounded-xl border border-[#dbe4ea] bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#16c7c0]"
        />
      </div>

      <div>
        <label htmlFor="plaque-purpose" className="text-sm font-medium text-slate-700">Plaque Purpose</label>
        <select id="plaque-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value as "general" | "review")}
          className="mt-2 w-full rounded-xl border border-[#dbe4ea] bg-white px-4 py-3 text-slate-900">
          <option value="general">General</option>
          <option value="review">Review Card</option>
        </select>
        {purpose === "review" && <p className="mt-2 text-sm text-slate-600">Review Card taps are tracked as review-page visits, not completed reviews.</p>}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-[#17324d] px-5 py-3 font-medium text-white disabled:opacity-50"
      >
        {saving ? "Creating..." : "Create Plaque"}
      </button>

      {message && (
        <p className="text-sm text-gray-600">
          {message}
        </p>
      )}
    </form>
  );
}