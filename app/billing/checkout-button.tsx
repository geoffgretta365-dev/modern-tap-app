"use client";

import { useState } from "react";

type CheckoutButtonProps = {
  hasSubscription?: boolean;
  planKey?: string;
  disabled?: boolean;
  label?: string;
};

export default function CheckoutButton({
  hasSubscription = false, planKey, disabled = false, label,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");

    try {
      const endpoint = hasSubscription
        ? "/api/stripe/portal"
        : "/api/stripe/checkout";

      const response = await fetch(endpoint, {
        method: "POST",
        ...(!hasSubscription && planKey ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planKey }) } : {}),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(
          data.error ||
            (hasSubscription
              ? "Unable to open subscription management"
              : "Unable to start checkout")
        );
      }

      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : hasSubscription
            ? "Unable to open subscription management"
            : "Unable to start checkout"
      );

      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        className="rounded-xl bg-[#17324d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#244560] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? hasSubscription
            ? "Opening Portal..."
            : "Opening Checkout..."
          : hasSubscription
            ? "Manage Subscription"
            : label ?? "Start Subscription"}
      </button>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}