import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function requireSubscription() {
  // TEMPORARY AUTH_DIAG: values come from the proxy's diagnostic request headers.
  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-moderntap-auth-diag-id") ?? "unavailable";
  const pathname = requestHeaders.get("x-moderntap-auth-diag-path") ?? "unavailable";
  const supabase = await createClient({
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  console.info("[AUTH_DIAG]", {
    requestId, layer: "requireSubscription", pathname,
    userFound: Boolean(user),
    errorCode: authError?.code ?? null,
    errorMessage: authError?.message ?? null,
    outcome: user ? "business lookup" : "redirect /auth/login",
  });

  if (!user) {
    redirect("/auth/login");
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();
  console.info("[AUTH_DIAG]", {
    requestId, layer: "requireSubscription", pathname,
    businessLookupReached: true, businessFound: Boolean(business),
    errorCode: businessError?.code ?? null,
    outcome: businessError ? "throw" : business ? "subscription lookup" : "redirect /onboarding",
  });

  if (businessError) {
    throw businessError;
  }

  if (!business) {
    redirect("/onboarding");
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("business_id", business.id)
    .maybeSingle();
  console.info("[AUTH_DIAG]", {
    requestId, layer: "requireSubscription", pathname,
    subscriptionLookupReached: true, subscriptionFound: Boolean(subscription),
    errorCode: subscriptionError?.code ?? null,
    outcome: subscriptionError ? "throw" :
      subscription?.status === "active" || subscription?.status === "trialing"
        ? "allow" : "redirect /billing",
  });

  if (subscriptionError) {
    throw subscriptionError;
  }

  if (subscription?.status !== "active" && subscription?.status !== "trialing") {
    redirect("/billing");
  }

  return { supabase, user, business };
}
