import ReviewPlaqueBenefit from "@/components/plans/review-plaque-benefit";
import { plaqueEntitlementsEnabled } from "@/lib/plans/entitlements-enabled";
export const instant = false;
import { redirect } from "next/navigation";
import Link from "next/link";
import AppShell from "@/app/components/app-shell";
import { requireSubscription } from "@/lib/require-subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, displayPrice, plaqueRange } from "@/lib/plans/catalog";
import { planForPrice, readPlanPrice } from "@/lib/plans/stripe-prices";
import { readPlaqueEntitlement } from "@/lib/plans/plaque-entitlement";
import { planChangeIssue } from "@/lib/plans/plan-change";
import ChangePlanButton from "./change-plan-button";

export default async function ChangePlanPage() {
  const { business } = await requireSubscription();
  if (!plaqueEntitlementsEnabled()) redirect("/billing");
  const { data: subscription, error } = await createAdminClient().from("subscriptions").select("stripe_price_id").eq("business_id", business.id).maybeSingle();
  if (error) throw error;
  const current = planForPrice(subscription?.stripe_price_id);
  const entitlement = await readPlaqueEntitlement(business.id);
  const options = await Promise.all(PLANS.filter(p => !p.custom).map(async plan => ({ plan, price: await readPlanPrice(plan) })));
  return <AppShell businessName={business.name}><div className="mx-auto max-w-7xl"><Link href="/billing" className="text-sm underline">← Back to Billing</Link><h1 className="mt-5 text-3xl font-bold text-[#17324d]">Change Plan</h1><p className="mt-2 text-slate-600">Your current plan: {current?.name ?? "Legacy / custom subscription"}. {entitlement.configured ? `${entitlement.activeCount} plaques active.` : "Contact ModernTap to configure your allowance."}</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{options.map(({ plan, price }) => {
      const issue = planChangeIssue(current, plan, entitlement.activeCount);
      return <section key={plan.key} className="mt-panel p-5"><h2 className="text-xl font-bold">{plan.name}{current?.key === plan.key && <span className="mt-2 block text-sm text-[#0f766e]">Current Plan</span>}</h2><p className="mt-4 text-3xl font-bold">{displayPrice(plan)}<span className="text-sm font-normal"> / month</span></p><p className="mt-2">{plaqueRange(plan)}</p><ReviewPlaqueBenefit plan={plan}/>{issue ? <p className="mt-5 text-sm text-slate-500">{issue}</p> : price.available && entitlement.configured ? <ChangePlanButton planKey={plan.key} name={plan.name}/> : <p className="mt-5 text-sm text-slate-500">Upgrade configuration unavailable.</p>}</section>;
    })}</div><section className="mt-6 border-t pt-5"><h2 className="font-semibold">Custom · 31+ plaques</h2><p className="mt-2 text-sm text-slate-600">Contact your ModernTap representative for a manually configured allowance. No automatic Custom checkout.</p></section>
  </div></AppShell>;
}
