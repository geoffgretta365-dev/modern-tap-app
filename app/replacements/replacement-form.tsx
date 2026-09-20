"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Plaque = {
  id: string;
  name: string;
};

type ReplacementFormProps = {
  businessId: string;
  plaques: Plaque[];
};

export default function ReplacementForm({
  businessId,
  plaques,
}: ReplacementFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [plaqueId, setPlaqueId] = useState("");
  const [reason, setReason] = useState("Damaged");
  const [details, setDetails] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    if (!plaqueId) {
      setError("Please select the plaque that needs to be replaced.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("replacement_requests")
      .insert({
        business_id: businessId,
        plaque_id: plaqueId,
        reason,
        details: details.trim() || null,
        shipping_name: shippingName.trim(),
        shipping_address_line1: address1.trim(),
        shipping_address_line2: address2.trim() || null,
        shipping_city: city.trim(),
        shipping_state: state.trim(),
        shipping_zip: zip.trim(),
      });

    if (insertError) {
      setError(
        "We couldn't submit your replacement request. Please try again."
      );
      setLoading(false);
      return;
    }

    setPlaqueId("");
    setReason("Damaged");
    setDetails("");

    setSuccess("Your replacement request has been submitted.");
    setLoading(false);

    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Request a Replacement
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Replacement protection is included with an active ModernTap
            subscription.
          </p>
        </div>

        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Unlimited replacements
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Plaque
            </span>

            <select
              value={plaqueId}
              onChange={(event) => setPlaqueId(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="">Select a plaque</option>

              {plaques.map((plaque) => (
                <option key={plaque.id} value={plaque.id}>
                  {plaque.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Reason
            </span>

            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option>Damaged</option>
              <option>Lost or stolen</option>
              <option>NFC stopped working</option>
              <option>Worn out</option>
              <option>Other</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            What happened? (optional)
          </span>

          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Tell us anything that will help us process the replacement."
            className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
        </label>

        <div className="border-t border-slate-200 pt-5">
          <h3 className="font-semibold text-slate-900">
            Shipping address
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Where should we send the replacement plaque?
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input
              value={shippingName}
              onChange={(event) => setShippingName(event.target.value)}
              required
              placeholder="Recipient name"
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 sm:col-span-2"
            />

            <input
              value={address1}
              onChange={(event) => setAddress1(event.target.value)}
              required
              placeholder="Address line 1"
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 sm:col-span-2"
            />

            <input
              value={address2}
              onChange={(event) => setAddress2(event.target.value)}
              placeholder="Address line 2 (optional)"
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 sm:col-span-2"
            />

            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              required
              placeholder="City"
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500"
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                value={state}
                onChange={(event) => setState(event.target.value)}
                required
                placeholder="State"
                maxLength={30}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500"
              />

              <input
                value={zip}
                onChange={(event) => setZip(event.target.value)}
                required
                placeholder="ZIP"
                maxLength={10}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500"
              />
            </div>
          </div>
        </div>

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
          {loading ? "Submitting..." : "Request Replacement"}
        </button>
      </form>
    </section>
  );
}