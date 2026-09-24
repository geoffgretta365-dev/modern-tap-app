import "server-only";
import Stripe from "stripe";
import { PLANS, type Plan } from "@/lib/plans/catalog";

const PRICE_ENV: Readonly<Record<string, string>> = {
  starter: "STRIPE_PRICE_STARTER", growth: "STRIPE_PRICE_GROWTH",
  pro: "STRIPE_PRICE_PRO", business: "STRIPE_PRICE_BUSINESS",
};
export function approvedPriceId(plan: Plan): string | null {
  const variable = PRICE_ENV[plan.key];
  if (plan.custom || !variable) return null;
  const id = process.env[variable]?.trim();
  if (!id) return null;
  // Duplicate mappings must never make one Stripe price represent different tiers.
  if (Object.values(PRICE_ENV).filter(name => process.env[name]?.trim() === id).length !== 1) return null;
  return id;
}
export function planForPrice(priceId: string | null | undefined): Plan | undefined {
  if (!priceId) return undefined;
  return PLANS.find(plan => approvedPriceId(plan) === priceId);
}
export type PlanPrice = { label: string; interval: string; available: boolean };
export async function readPlanPrice(plan: Plan): Promise<PlanPrice> {
  const priceId = approvedPriceId(plan);
  const unavailable = { label: "Checkout unavailable", interval: "", available: false };
  if (!priceId || !process.env.STRIPE_SECRET_KEY) return unavailable;
  try {
    const price = await new Stripe(process.env.STRIPE_SECRET_KEY).prices.retrieve(priceId);
    if (price.currency !== plan.currency || price.unit_amount !== Math.round((plan.monthlyPrice ?? 0) * 100)
      || price.recurring?.interval !== plan.billingInterval || price.recurring.interval_count !== 1
      || price.billing_scheme !== "per_unit" || price.recurring.usage_type !== "licensed" || price.transform_quantity) return unavailable;
    return { label: `${new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(price.unit_amount / 100)} / month`, interval: "month", available: price.active };
  } catch {
    return unavailable;
  }
}
