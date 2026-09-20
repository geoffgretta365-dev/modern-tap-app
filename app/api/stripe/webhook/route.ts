import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 400 }
    );
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const businessId = session.metadata?.business_id;

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : null;

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : null;

    if (businessId && subscriptionId) {
      const subscription =
        await stripe.subscriptions.retrieve(subscriptionId);

      const { error } = await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            business_id: businessId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            stripe_price_id:
              subscription.items.data[0]?.price.id ?? null,
            status: subscription.status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_id" }
        );

      if (error) {
        console.error(
          "Supabase subscription upsert failed:",
          error
        );

        return NextResponse.json(
          { error: "Database update failed" },
          { status: 500 }
        );
      }
    }
  }

if (
  event.type === "customer.subscription.updated" ||
  event.type === "customer.subscription.deleted"
) {
  const subscription = event.data.object as Stripe.Subscription;

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
  stripe_price_id: subscription.items.data[0]?.price.id ?? null,
  status: subscription.status,
  cancel_at_period_end: subscription.cancel_at_period_end,
  cancel_at: subscription.cancel_at
    ? new Date(subscription.cancel_at * 1000).toISOString()
    : null,
  updated_at: new Date().toISOString(),
}) 
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Supabase subscription update failed:", error);

    return NextResponse.json(
      { error: "Database update failed" },
      { status: 500 }
    );
  }
}

  return NextResponse.json({ received: true });
}