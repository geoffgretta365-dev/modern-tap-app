"use client";

import Link from "next/link";
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
    if (loading || plaques.length === 0) return;

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

    setSuccess("Replacement request submitted. You can track its status below.");
    setLoading(false);

    router.refresh();
  }

  return (
    <section className="mt-panel min-w-0 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#17324d]">
            Request a Replacement
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Tell us which plaque needs attention and where a replacement should be sent.
          </p>
        </div>
      </div>

      {plaques.length === 0 && <div className="mt-5 rounded-xl bg-[#f3f7f9] p-4 text-sm text-slate-600">
        <p>You need at least one plaque in your account before submitting a replacement request.</p>
        <Link href="/plaques" className="mt-secondary-action mt-3">View My Plaques</Link>
      </div>}
      <p className="mt-4 text-xs text-slate-500">All fields are required unless marked optional.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="text-sm font-semibold text-slate-700">
              Plaque to Replace
            </span>

            <select
              aria-describedby="replacement-plaque-help"
              value={plaqueId}
              onChange={(event) => setPlaqueId(event.target.value)}
              required
              className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-[#dbe4ea] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#16c7c0] focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
            >
              <option value="">Select a plaque</option>

              {plaques.map((plaque) => (
                <option key={plaque.id} value={plaque.id}>
                  {plaque.name}
                </option>
              ))}
            </select>
            <span id="replacement-plaque-help" className="mt-2 block text-xs leading-5 text-slate-500">Choose the physical plaque this request applies to.</span>
          </label>

          <label className="block min-w-0">
            <span className="text-sm font-semibold text-slate-700">
              Reason
            </span>

            <select
              aria-describedby="replacement-reason-help"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-[#dbe4ea] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#16c7c0] focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
            >
              <option>Damaged</option>
              <option>Lost or stolen</option>
              <option>NFC stopped working</option>
              <option>Worn out</option>
              <option>Other</option>
            </select>
            <span id="replacement-reason-help" className="mt-2 block text-xs leading-5 text-slate-500">Choose the option that best describes why the plaque needs replacement.</span>
          </label>
        </div>

        <label className="block min-w-0">
          <span className="text-sm font-semibold text-slate-700">
            Additional Details <span className="font-normal text-slate-500">(optional)</span>
          </span>

          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={4}
            maxLength={1000}
            aria-describedby="replacement-details-help"
            placeholder="Example: The plaque was damaged during cleaning and the front surface is cracked."
            className="mt-2 w-full min-w-0 max-w-full resize-y rounded-xl border border-[#dbe4ea] px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#16c7c0] focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
          />
        </label>

        <div className="flex flex-wrap justify-between gap-2 text-xs leading-5 text-slate-500">
          <p id="replacement-details-help">Optional: Add anything that will help us review the request.</p>
          <span className="tabular-nums">{details.length} / 1000</span>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <h3 className="font-semibold text-slate-900">
            Shipping Address
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Where should the replacement plaque be sent if the request is approved?
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0 sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Recipient Name</span>
              <input autoComplete="name"
                value={shippingName}
                onChange={(event) => setShippingName(event.target.value)}
                required
                placeholder="Recipient name"
                className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-[#dbe4ea] px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#16c7c0] focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
              />
            </label>

            <label className="block min-w-0 sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Address Line 1</span>
              <input autoComplete="address-line1"
                value={address1}
                onChange={(event) => setAddress1(event.target.value)}
                required
                placeholder="Address line 1"
                className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-[#dbe4ea] px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#16c7c0] focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
              />
            </label>

            <label className="block min-w-0 sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Address Line 2 (Optional)</span>
              <input autoComplete="address-line2"
                value={address2}
                onChange={(event) => setAddress2(event.target.value)}
                placeholder="Address line 2 (optional)"
                className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-[#dbe4ea] px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#16c7c0] focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
              />
            </label>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-slate-700">City</span>
              <input autoComplete="address-level2"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                required
                placeholder="City"
                className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-[#dbe4ea] px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#16c7c0] focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-slate-700">State</span>
                <input autoComplete="address-level1"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  required
                  placeholder="State"
                  maxLength={30}
                  className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-[#dbe4ea] px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#16c7c0] focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-slate-700">ZIP Code</span>
                <input autoComplete="postal-code"
                  value={zip}
                  onChange={(event) => setZip(event.target.value)}
                  required
                  placeholder="ZIP"
                  maxLength={10}
                  className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-[#dbe4ea] px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#16c7c0] focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
                />
              </label>
            </div>
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}

        {success ? (
          <p role="status" className="text-sm font-medium text-[#0f8f8a]">
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || plaques.length === 0}
          className="mt-primary-action disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending Request..." : "Send Replacement Request"}
        </button>
      </form>
    </section>
  );
}
