export const instant = false;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";
import ModernTapBrand from "@/components/modern-tap-brand";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (business) {
    redirect("/dashboard");
  }

  return (
    <main className="mt-onboarding min-h-screen px-6 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mt-panel p-6 sm:p-8">
          <ModernTapBrand href="/" />

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Set up your business
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Enter your business name to finish setting up your ModernTap account.
          </p>

          <OnboardingForm userId={user.id} />
        </div>
      </div>
    </main>
  );
}