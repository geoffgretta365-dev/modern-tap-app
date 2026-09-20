"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Plaque = {
  id: string;
  name: string;
};

type SupportFormProps = {
  businessId: string;
  plaques: Plaque[];
};

export default function SupportForm({
  businessId,
  plaques,
}: SupportFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [category, setCategory] = useState("Plaque / NFC issue");
  const [plaqueId, setPlaqueId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    const { error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        business_id: businessId,
        plaque_id: plaqueId || null,
        category,
        subject: subject.trim(),
        message: message.trim(),
      });

    if (insertError) {
      setError(
        "We couldn't submit your support request. Please try again."
      );
      setLoading(false);
      return;
    }

    setSubject("");
    setMessage("");
    setPlaqueId("");

    setSuccess("Your support request has been submitted.");
    setLoading(false);

    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Contact ModernTap Support
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Tell us what you need help with and we'll get back to you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Category
            </span>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option>Plaque / NFC issue</option>
              <option>Replacement request</option>
              <option>Billing</option>
              <option>Account / software issue</option>
              <option>Destination / link issue</option>
              <option>Other</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Plaque (optional)
            </span>

            <select
              value={plaqueId}
              onChange={(event) => setPlaqueId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="">
                Not related to a specific plaque
              </option>

              {plaques.map((plaque) => (
                <option key={plaque.id} value={plaque.id}>
                  {plaque.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            Subject
          </span>

          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
            maxLength={120}
            placeholder="Briefly describe the issue"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            How can we help?
          </span>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            rows={6}
            maxLength={2000}
            placeholder="Give us the details so we can help as quickly as possible."
            className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
        </label>

        {error ? (
          <p className="text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="text-sm font-medium text-emerald-700">
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Submitting..."
            : "Submit Support Request"}
        </button>
      </form>
    </section>
  );
}