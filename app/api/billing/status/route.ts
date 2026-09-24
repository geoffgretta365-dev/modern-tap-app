import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasConfirmedActivation } from "@/lib/stripe/activation";

export async function GET() {
  const supabase = await createClient({ fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) });
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return reply({ error: "Sign in to check activation." }, 401);
  const { data: business, error } = await supabase.from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  if (error) return reply({ error: "Unable to check account." }, 500);
  if (!business) return reply({ error: "Complete business setup first." }, 404);
  const { data, error: subscriptionError } = await createAdminClient().from("subscriptions")
    .select("status, stripe_subscription_id").eq("business_id", business.id).maybeSingle();
  if (subscriptionError) return reply({ error: "Unable to check subscription." }, 500);
  return reply({ active: hasConfirmedActivation(data) });
}
