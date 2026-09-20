export const instant = false;

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AppShell from "@/app/components/app-shell";
import CheckoutButton from "./checkout-button";
import { isTerminalSubscriptionStatus } from "@/lib/stripe/subscription-status";

export default async function BillingPage() {
  // TEMPORARY AUTH_DIAG: correlate Billing's independent auth check with the proxy.
  const requestId = (await headers()).get("x-moderntap-auth-diag-id") ?? "unavailable";
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  console.info("[AUTH_DIAG]", {
    requestId, layer: "billing", pathname: "/billing",
    userFound: Boolean(user),
    errorCode: authError?.code ?? null,
    errorMessage: authError?.message ?? null,
    outcome: user ? "continue" : "redirect /auth/login",
  });

  if (!user) {
    redirect("/auth/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();

    const { data: subscription, error: subscriptionError } = business
  ? await createAdminClient()
      .from("subscriptions")
      .select(
  "status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, cancel_at"
)
      .eq("business_id", business.id)
      .maybeSingle()
  : { data: null, error: null };

  if (subscriptionError) {
    throw subscriptionError;
  }

  if (!business) {
    return (
      <AppShell>
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-slate-950">
            Billing
          </h1>
          <p className="mt-2 text-slate-500">
            No business found for this account.
          </p>
        </div>
      </AppShell>
    );
  }

  const isActiveSubscription =
    subscription?.status === "active" || subscription?.status === "trialing";
  const canManageSubscription = Boolean(
    subscription?.stripe_customer_id &&
      !isTerminalSubscriptionStatus(subscription.status)
  );

  return (
    <AppShell businessName={business.name}>
      <div className="mx-auto max-w-7xl">

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Subscription
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Billing
          </h1>

          <p className="mt-2 text-slate-500">
            Manage your ModernTap subscription and billing.
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Current Plan
                </p>

                <h2 className="mt-3 text-2xl font-bold text-slate-950">
                  ModernTap
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Smart plaque management, tap tracking, and analytics.
                </p>
              </div>

              <span
  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
    subscription?.status === "active"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700"
  }`}
>
  {subscription?.status === "active"
    ? subscription?.cancel_at
      ? `Active — Cancels ${new Date(subscription.cancel_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`
      : "Active"
    : subscription?.status === "trialing"
      ? "Trialing"
      : "Setup Pending"}
</span>

            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">

              <p className="text-sm font-semibold text-slate-950">
                Included with ModernTap
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">

                <Feature text="Smart plaque management" />
                <Feature text="Remote destination changes" />
                <Feature text="Tap analytics" />
                <Feature text="Customer dashboard" />
                <Feature text="Multiple plaques" />
                <Feature text="Performance tracking" />

              </div>

            </div>

          </section>

          <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">

            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Billing Status
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              {isActiveSubscription ? "Billing is active." : "Stripe setup is next."}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              {isActiveSubscription
                ? "Your account is connected to Stripe. Payments, invoices, and subscription management are handled securely through Stripe."
                : "We'll connect this account to Stripe so subscriptions, payments, invoices, and cancellations can be managed automatically."}
            </p>

            <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-4">

              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Account
              </p>

              <p className="mt-2 font-semibold text-white">
                {business.name}
              </p>

            </div>

          </section>

        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-950">
            Payment & Subscription
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isActiveSubscription
              ? "Manage your payment method, invoices, and subscription securely through Stripe."
              : "Once Stripe is connected, customers will be able to start their subscription and securely manage their payment method, invoices, and cancellation from here."}
          </p>

          <CheckoutButton hasSubscription={canManageSubscription} />
        </section>

      </div>
    </AppShell>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">

      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600">
        ✓
      </div>

      <p className="text-sm text-slate-600">
        {text}
      </p>

    </div>
  );
}
