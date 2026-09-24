export const instant = false;

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/app-shell";
import { formatEasternDate } from "@/lib/format-eastern-time";
import CheckoutButton from "./checkout-button";
import { isTerminalSubscriptionStatus } from "@/lib/stripe/subscription-status";

const statusLabels: Record<string, string> = {
  active: "Active", trialing: "Trial", past_due: "Past Due", unpaid: "Unpaid",
  incomplete: "Setup Incomplete", incomplete_expired: "Setup Expired",
  canceled: "Canceled", paused: "Paused",
};

function validDate(value: string | null | undefined) {
  return value && Number.isFinite(new Date(value).getTime()) ? value : null;
}

export default async function BillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        .select("status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, cancel_at")
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
          <h1 className="text-3xl font-bold text-[#17324d]">
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

  const statusLabel = !subscription ? "Not Started"
    : statusLabels[subscription.status] ?? "Status Unavailable";
  const periodEnd = validDate(subscription?.current_period_end);
  const cancellationDate = isActiveSubscription
    ? validDate(subscription?.cancel_at) ?? (subscription?.cancel_at_period_end ? periodEnd : null)
    : null;
  const statusSummary = cancellationDate
    ? `${statusLabel} — Cancels ${formatEasternDate(cancellationDate, { month: "short", day: "numeric", year: "numeric" })}`
    : statusLabel;
  const billingMessage = !subscription
    ? { heading: "Subscription setup", description: "Start your ModernTap subscription to activate recurring billing and manage payments securely through Stripe." }
    : isActiveSubscription
      ? { heading: "Billing is active.", description: "Your subscription is connected to Stripe. Payment methods, invoices, and subscription management are handled securely through Stripe." }
      : subscription.status === "past_due" || subscription.status === "unpaid"
        ? { heading: "Billing needs attention.", description: "Your subscription has a billing issue. Open the Stripe billing portal to review your payment method and account." }
        : isTerminalSubscriptionStatus(subscription.status)
          ? { heading: "Subscription inactive.", description: "Your previous subscription is no longer active. You can review the available subscription options below." }
          : subscription.status === "paused"
            ? { heading: "Subscription paused.", description: "Your subscription is paused. Open the Stripe billing portal to review your subscription settings." }
            : subscription.status === "incomplete"
              ? { heading: "Finish subscription setup.", description: canManageSubscription
                  ? "Your subscription setup is incomplete. Open the Stripe billing portal to review your payment method and subscription."
                  : "Complete Stripe checkout to finish setting up your ModernTap subscription." }
              : { heading: "Review your subscription.", description: "Review your subscription and available billing options below." };

  return (
    <AppShell businessName={business.name}>
      <div className="mx-auto max-w-7xl">

        <div>
          <p className="mt-kicker">
            Subscription
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17324d] sm:text-4xl">
            Billing
          </h1>

          <p className="mt-2 text-slate-500">
            View your ModernTap service, subscription status, and billing options.
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">

          <section className="mt-panel min-w-0 p-5 sm:p-6">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

              <div>
                <p className="mt-kicker">
                  Current Plan
                </p>

                <h2 className="mt-3 text-2xl font-bold text-[#17324d]">
                  ModernTap Service
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Plaque management, customer engagement analytics, Smart Pages, and ongoing account support.
                </p>
              </div>

              <span className={`w-fit max-w-full rounded-full px-3 py-1 text-xs font-semibold ${isActiveSubscription ? "mt-badge-teal" : "bg-amber-50 text-amber-700"}`}>
                {statusSummary}
              </span>

            </div>

            <dl className="mt-6 grid gap-4 rounded-xl bg-[#f3f7f9] p-4 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt><dd className="mt-2 text-sm font-semibold text-[#17324d]">{statusSummary}</dd></div>
              {(cancellationDate || periodEnd) && <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cancellationDate ? "Service Through" : "Current Period"}</dt>
                <dd className="mt-2 text-sm text-[#17324d]">{!cancellationDate && "Through "}<time dateTime={cancellationDate ?? periodEnd!}>{formatEasternDate((cancellationDate ?? periodEnd)!, { month: "long", day: "numeric", year: "numeric" })}</time></dd>
              </div>}
            </dl>

            <div className="mt-8 border-t border-slate-100 pt-6">

              <p className="text-sm font-semibold text-[#17324d]">
                Included with ModernTap
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">

                <Feature text="Plaque management" />
                <Feature text="Remote destination updates" />
                <Feature text="Engagement analytics" />
                <Feature text="Smart Pages" />
                <Feature text="Smart Page action tracking" />
                <Feature text="Design support" />
                <Feature text="Replacement request support" />
                <Feature text="Customer dashboard" />

              </div>

            </div>

          </section>

          <section className="mt-panel min-w-0 p-5 sm:p-6">

            <p className="mt-kicker">
              Billing Status
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              {billingMessage.heading}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {billingMessage.description}
            </p>

            <div className="mt-8 rounded-xl border border-[#dbe4ea] bg-[#f3f7f9] p-4">

              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Account
              </p>

              <p className="mt-2 break-words font-semibold text-[#17324d] [overflow-wrap:anywhere]">
                {business.name}
              </p>
              <p className="mt-2 text-xs text-slate-600">Subscription: {statusSummary}</p>

            </div>

          </section>

        </div>

        <section className="mt-6 mt-panel min-w-0 p-5 sm:p-6">

          <h2 className="text-lg font-bold text-[#17324d]">
            Payment & Subscription
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {canManageSubscription
              ? "Manage payment methods, invoices, and subscription settings securely through Stripe."
              : "Start or restore your ModernTap subscription securely through Stripe."}
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

      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dffaf8] text-xs font-bold text-[#0f8f8a]">
        ✓
      </div>

      <p className="text-sm text-slate-600">
        {text}
      </p>

    </div>
  );
}
