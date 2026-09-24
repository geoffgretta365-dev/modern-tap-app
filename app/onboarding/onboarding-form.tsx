"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
};

export default function OnboardingForm({ userId }: Props) {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submissionPending = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionPending.current) return;

    const name = businessName.trim();

    if (!name) {
      setError("Enter your business name.");
      return;
    }

    submissionPending.current = true;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("businesses")
        .insert({
          owner_id: userId,
          name,
        });

      if (insertError) throw insertError;
      router.push("/tour");
      router.refresh();
    } catch {
      setError("Could not create your business. Please try again.");
      submissionPending.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="businessName"
          className="text-sm font-semibold text-slate-900"
        >
          Business name
        </label>

        <input
          id="businessName"
          type="text"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="Example: Lorenzo's Restaurant"
          required
          aria-describedby="business-name-help"
          autoComplete="organization"
          maxLength={100}
          className="mt-2 w-full min-w-0 rounded-xl border border-[#dbe4ea] px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#16c7c0] focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
        />
        <p id="business-name-help" className="mt-2 text-xs leading-5 text-slate-500">This is the business name that will appear throughout your ModernTap account.</p>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-5 text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#17324d] px-4 py-3 font-semibold text-white transition hover:bg-[#244560] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Creating Business..."
          : "Continue to Tour"}
      </button>
    </form>
  );
}