import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTerminalSubscriptionStatus } from "@/lib/stripe/subscription-status";

import { getPlan } from "@/lib/plans/catalog";
import { approvedPriceId, readPlanPrice } from "@/lib/plans/stripe-prices";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();

  if (businessError || !business) {
    return NextResponse.json(
      { error: "Business not found" },
      { status: 404 }
    );
  }

  const { data: subscription, error: subscriptionError } = await createAdminClient()
    .from("subscriptions")
    .select("status, stripe_subscription_id")
    .eq("business_id", business.id)
    .maybeSingle();

  if (subscriptionError) {
    return NextResponse.json(
      { error: "Could not check subscription status" },
      { status: 500 }
    );
  }

  let subscriptionStatus = subscription?.status;

  if (subscription?.stripe_subscription_id) {
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id
      );
      subscriptionStatus = stripeSubscription.status;
    } catch {
      return NextResponse.json(
        { error: "Could not verify existing Stripe subscription" },
        { status: 502 }
      );
    }
  }

  if (subscription && !isTerminalSubscriptionStatus(subscriptionStatus)) {
    return NextResponse.json(
      { error: "An existing subscription must be managed through Billing" },
      { status: 409 }
    );
  }

  // Checkout requires an explicit catalog key. Legacy prices remain management-only.
  // Any supplied configuration must be an approved plan key, never a Stripe ID.
  let planKey: unknown;
  try {
    const raw = await request.text();
    if (raw.trim()) {
      const input: unknown = JSON.parse(raw);
      if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => key !== "planKey")) {
        return NextResponse.json({ error: "Send only a valid planKey." }, { status: 400 });
      }
      planKey = (input as { planKey?: unknown }).planKey;
    }
  } catch { return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 }); }
  const plan = getPlan(planKey);
  if (!plan) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  const priceId = approvedPriceId(plan);
  if (!priceId || !(await readPlanPrice(plan)).available) return NextResponse.json({ error: "Checkout is unavailable for this plan." }, { status: 503 });

  const origin = new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
    metadata: {
      business_id: business.id,
      plan_key: plan.key,
    },
    subscription_data: {
      metadata: {
        business_id: business.id,
      plan_key: plan.key,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
