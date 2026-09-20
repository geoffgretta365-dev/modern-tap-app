import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireSubscription() {
  const supabase = await createClient({
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

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

  if (subscriptionError) {
    throw subscriptionError;
  }

  if (subscription?.status !== "active" && subscription?.status !== "trialing") {
    redirect("/billing");
  }

  return { supabase, user, business };
}
