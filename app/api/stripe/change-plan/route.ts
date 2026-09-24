import { plaqueEntitlementsEnabled } from "@/lib/plans/entitlements-enabled";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { plaqueOwner } from "@/lib/plans/plaque-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan } from "@/lib/plans/catalog";
import { approvedPriceId, planForPrice, readPlanPrice } from "@/lib/plans/stripe-prices";
import { readPlaqueEntitlement } from "@/lib/plans/plaque-entitlement";
import { planChangeIssue } from "@/lib/plans/plan-change";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { timeout: 20000, maxNetworkRetries: 1 });
const fail = (error: string, status = 409) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  if (!plaqueEntitlementsEnabled()) return fail("Plan changes are not enabled.", 404);
  const owner = await plaqueOwner();
  if (owner.response) return owner.response;
  let input;
  try { input = await request.json(); } catch { return fail("Invalid request.", 400); }
  if (!input || Object.keys(input).length !== 1 || !getPlan(input.planKey)) return fail("Send only a valid planKey.", 400);
  const target = getPlan(input.planKey)!;
  const admin = createAdminClient();
  const { data: subscription, error } = await admin.from("subscriptions").select("status, stripe_subscription_id, stripe_customer_id, stripe_price_id").eq("business_id", owner.business.id).maybeSingle();
  if (error) return fail("Could not check subscription.", 503);
  if (!subscription?.stripe_subscription_id || !["active", "trialing"].includes(subscription.status)) return fail("An active subscription is required. Review Billing.");
  const current = planForPrice(subscription.stripe_price_id);
  const entitlement = await readPlaqueEntitlement(owner.business.id);
  if (!entitlement.configured) return fail("Your allowance is not configured. Contact ModernTap.");
  if (current && (entitlement.planKey !== current.key || entitlement.maximum !== current.maximumPlaques)) return fail("Subscription configuration differs from your allowance. Contact ModernTap.");
  const issue = planChangeIssue(current, target, entitlement.activeCount);
  if (issue) return fail(issue);
  const targetPrice = approvedPriceId(target);
  if (!targetPrice || !(await readPlanPrice(target)).available) return fail("This plan's Stripe price is not available.", 503);
  const { data: targetMaximum, error: mappingError } = await admin.rpc("configured_plaque_limit", { p_price_id: targetPrice });
  if (mappingError || targetMaximum !== target.maximumPlaques) return fail("This plan's allowance is not configured. Contact ModernTap.", 503);
  const { data: token, error: lockError } = await admin.rpc("reserve_plan_change", { p_business_id: owner.business.id, p_expected_price: subscription.stripe_price_id });
  if (lockError || !token) return fail("A plan change may already be processing. Refresh Billing before trying again.");
  let release = false;
  try {
    // Retrieve after acquiring the distributed lease; never update from browser/persisted IDs alone.
    const live = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id, { expand: ["latest_invoice"] });
    const customerId = typeof live.customer === "string" ? live.customer : live.customer.id;
    const item = live.items.data[0];
    const invoice = typeof live.latest_invoice === "object" ? live.latest_invoice : null;
    if (item?.price.recurring?.interval !== "month" || item.price.recurring.interval_count !== 1
      || item.price.currency !== current!.currency || item.price.unit_amount !== Math.round(current!.monthlyPrice! * 100)
      || customerId !== subscription.stripe_customer_id || live.items.data.length !== 1 || item.quantity !== 1
      || item.price.id !== subscription.stripe_price_id || !["active", "trialing"].includes(live.status)
      || live.collection_method !== "charge_automatically" || live.pause_collection || (invoice && invoice.amount_remaining > 0)
      || live.pending_update || live.schedule || live.cancel_at_period_end || live.cancel_at) {
      release = true;
      return fail("Your Stripe subscription has changed or needs attention. Refresh Billing or manage your subscription before upgrading.");
    }
    const updated = await stripe.subscriptions.update(live.id, {
      items: [{ id: item.id, price: targetPrice, quantity: 1 }],
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
    }, { idempotencyKey: `moderntap-plan-change-${token}` });
    release = true;
    return NextResponse.json({ pendingPayment: Boolean(updated.pending_update), message: updated.pending_update
      ? "Payment needs attention. Manage Subscription in Billing, then refresh. Your current allowance remains until Stripe confirms the change."
      : "Stripe accepted your upgrade. Refresh Billing shortly; your allowance changes only after confirmation is saved." });
  } catch {
    // Keep the ten-minute lease after an ambiguous network/provider failure; do not issue competing changes.
    return fail("Could not confirm the plan change. Check Billing before retrying; another attempt may be held for up to ten minutes.", 502);
  } finally {
    if (release) await admin.rpc("release_plan_change", { p_business_id: owner.business.id, p_token: token });
  }
}
