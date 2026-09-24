// A Checkout return URL is not proof of payment. Only persisted subscription state
// with a Stripe subscription reference can confirm this checkout activation UI.
export function hasConfirmedActivation(subscription: { status: string; stripe_subscription_id?: string | null } | null) {
  return !!subscription?.stripe_subscription_id && (subscription.status === "active" || subscription.status === "trialing");
}
export const ACTIVATION_ATTEMPTS = 12;
export const ACTIVATION_DELAY_MS = 2500;
