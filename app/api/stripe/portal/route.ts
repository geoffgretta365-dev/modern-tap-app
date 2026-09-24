import { plaqueEntitlementsEnabled } from "@/lib/plans/entitlements-enabled";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json(
      { error: "Business not found" },
      { status: 404 }
    );
  }

  const { data: subscription, error: subscriptionError } = await createAdminClient()
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("business_id", business.id)
    .maybeSingle();

  if (subscriptionError) {
    return NextResponse.json(
      { error: "Could not check subscription status" },
      { status: 500 }
    );
  }

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json(
      { error: "Stripe customer not found" },
      { status: 404 }
    );
  }

  const origin = new URL(request.url).origin;

  // A general Stripe Portal plan/quantity switch would bypass ModernTap's capacity checks.
  // Read configuration only: operators configure the portal; this endpoint never changes it.
  try {
    if (!plaqueEntitlementsEnabled()) {
      const session = await stripe.billingPortal.sessions.create({ customer: subscription.stripe_customer_id, return_url: `${origin}/billing` });
      return NextResponse.json({ url: session.url });
    }
    const configurations = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
    const configuration = configurations.data[0];
    if (!configuration?.active || configuration.features.subscription_update.enabled) {
      return NextResponse.json({ error: "Subscription management needs configuration. Contact ModernTap; plan changes must use Change Plan." }, { status: 409 });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      configuration: configuration.id,
      return_url: `${origin}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Could not open subscription management. Try again shortly." }, { status: 502 });
  }
}
