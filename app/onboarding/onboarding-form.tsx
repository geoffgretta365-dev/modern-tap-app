"use client";

import { FormEvent, useState } from "react";
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = businessName.trim();

    if (!name) {
      setError("Enter your business name.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error: insertError } = await supabase
      .from("businesses")
      .insert({
        owner_id: userId,
        name,
      });

    if (insertError) {
      setError("Could not create your business. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
          placeholder="Example: ModernTap Coffee"
          autoComplete="organization"
          maxLength={100}
          className="mt-2 w-full rounded-xl border border-[#dbe4ea] px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#16c7c0]"
        />
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#17324d] px-4 py-3 font-semibold text-white transition hover:bg-[#244560] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Creating business..."
          : "Continue to Dashboard"}
      </button>
    </form>
  );
}