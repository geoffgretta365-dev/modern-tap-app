export const instant = false;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";
import Image from "next/image";

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
    redirect("/tour");
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#f3f7f9] px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full min-w-0 max-w-md">
        <header className="mb-6 text-center">
          <Image src="/modern-tap-logo.png" alt="ModernTap" width={2172} height={724}
            sizes="208px" priority className="mx-auto h-auto w-52 max-w-full" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0f8f8a]">Business Portal</p>
        </header>
        <div className="rounded-2xl border border-[#dbe4ea] bg-white p-5 shadow-sm sm:p-7">
          <p className="mt-kicker">Account Setup</p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#17324d]">
            Set Up Your Business
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add your business name to create your ModernTap workspace.
          </p>

          <OnboardingForm userId={user.id} />
        </div>
        <p className="mt-6 px-2 text-center text-xs leading-6 text-slate-500">You can manage your plaques, customer engagement, Smart Pages, and account settings from your dashboard.</p>
      </div>
    </main>
  );
}