export const instant = false;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";

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
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            ModernTap
          </p>

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