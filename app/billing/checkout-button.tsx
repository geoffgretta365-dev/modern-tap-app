"use client";

import { useState } from "react";

type CheckoutButtonProps = {
  hasSubscription?: boolean;
};

export default function CheckoutButton({
  hasSubscription = false,
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
        disabled={loading}
        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? hasSubscription
            ? "Opening Portal..."
            : "Opening Checkout..."
          : hasSubscription
            ? "Manage Subscription"
            : "Subscribe — $29.99/month"}
      </button>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}