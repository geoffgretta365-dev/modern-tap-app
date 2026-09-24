export const instant = false;
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePreSubscriptionBusiness } from "@/lib/customer-journey";
import { getPlan } from "@/lib/plans/catalog";
import { readPlanPrice } from "@/lib/plans/stripe-prices";
import PlanSummary from "@/components/plans/plan-summary";
import CheckoutButton from "@/app/billing/checkout-button";

export default async function ReviewPlanPage({ params }: { params: Promise<{planKey:string}> }) {
  await requirePreSubscriptionBusiness();
  const plan = getPlan((await params).planKey);
  if (!plan) notFound();
  const price = await readPlanPrice(plan);
  return <main className="min-h-svh bg-[#f3f7f9] px-4 py-10"><div className="mx-auto max-w-xl">
    <Link href="/billing" className="text-sm font-semibold text-[#0f766e] underline">← Back to Billing</Link>
    <h1 className="mb-6 mt-5 text-3xl font-bold text-[#17324d]">Review Your Plan</h1>
    <section className="mt-panel p-5 sm:p-7"><PlanSummary plan={plan}/>
      {!plan.custom && <CheckoutButton planKey={plan.key} disabled={!price.available} label="Continue to Checkout"/>}
      {plan.custom ? <p className="mt-4 font-semibold">Contact your ModernTap representative to arrange a custom plan.</p> : !price.available && <p role="status" className="mt-3 text-sm text-slate-600">Checkout is unavailable until this plan has an approved, available price.</p>}
      <p className="mt-3 text-xs text-slate-500">Payment is completed securely on Stripe. No payment is taken on this page.</p>
    </section>
  </div></main>;
}
