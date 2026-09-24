import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTerminalSubscriptionStatus } from "@/lib/stripe/subscription-status";

// Entry pages are authenticated but intentionally do not require a paid subscription.
export async function requirePreSubscriptionBusiness() {
  const supabase = await createClient({ fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth/login");
  const { data: business, error } = await supabase.from("businesses").select("id, name").eq("owner_id", user.id).maybeSingle();
  if (error) throw error;
  if (!business) redirect("/onboarding");
  const { data: subscription, error: subscriptionError } = await supabase.from("subscriptions").select("status").eq("business_id", business.id).maybeSingle();
  if (subscriptionError) throw subscriptionError;
  if (subscription?.status === "active" || subscription?.status === "trialing") redirect("/dashboard");
  if (subscription && !isTerminalSubscriptionStatus(subscription.status)) redirect("/billing");
  return { business };
}
