export const instant = false;

import AppShell from "@/app/components/app-shell";
import { requireSubscription } from "@/lib/require-subscription";
import SettingsForm from "./settings-form";
export default async function SettingsPage() {
  const { user, business } = await requireSubscription();

  return (
    <AppShell businessName={business.name}>
      <div className="mx-auto max-w-[1280px]">
        <div>
          <p className="mt-kicker">
            Settings
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17324d]">
            Settings
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            View and manage your ModernTap account information.
          </p>
        </div>

        <div className="mt-8 grid gap-6">
          <section className="mt-panel p-6">
            <h2 className="text-lg font-bold text-[#17324d]">
              Business
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              The business connected to this ModernTap account.
            </p>

            <SettingsForm
  businessId={business.id}
  currentName={business.name}
/>
          </section>

          <section className="mt-panel p-6">
            <h2 className="text-lg font-bold text-[#17324d]">
              Account
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your login information for ModernTap.
            </p>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Email
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {user.email ?? "No email available"}
              </p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}