"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function NewPlaqueForm({
  businessId,
}: {
  businessId: string;
}) {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const router = useRouter();

  function generateCode() {
    return crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  }

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

    const supabase = createClient();

    const { error } = await supabase.from("plaques").insert({
      business_id: businessId,
      name: name.trim(),
      code: generateCode(),
      destination_url: cleanUrl,
      active: true,
    });

    if (error) {
      console.error(error);
      setMessage("Could not create the plaque.");
      setSaving(false);
      return;
    }

    router.push("/plaques");
    router.refresh();
  }

  return (
    <form onSubmit={createPlaque} className="mt-8 space-y-5">
      <div>
        <label className="text-sm font-medium text-gray-700">
          Plaque Name
        </label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Front Counter Review Plaque"
          className="mt-2 w-full rounded-lg border px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">
          Destination URL
        </label>

        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="https://..."
          className="mt-2 w-full rounded-lg border px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
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