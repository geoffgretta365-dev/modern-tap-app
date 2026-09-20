"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  businessId: string;
  currentName: string;
};

export default function SettingsForm({
  businessId,
  currentName,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Business name cannot be empty.");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("businesses")
      .update({ name: trimmedName })
      .eq("id", businessId);

    if (updateError) {
      setError("Could not update your business name.");
      setLoading(false);
      return;
    }

    setName(trimmedName);
    setMessage("Business name updated.");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5">
      <label
        htmlFor="businessName"
        className="text-xs font-semibold uppercase tracking-wide text-slate-400"
      >
        Business name
      </label>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="businessName"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
         className="w-full rounded-xl border border-[#dbe4ea] bg-white px-4 py-2.5 text-sm text-slate-900 caret-slate-900 outline-none placeholder:text-slate-400 focus:border-[#16c7c0]"
        />

        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-xl bg-[#17324d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244560] disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mt-2 text-sm font-medium text-green-700">
          {message}
        </p>
      ) : null}
    </form>
  );
}