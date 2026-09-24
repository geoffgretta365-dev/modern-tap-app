import { plaqueEntitlementsEnabled } from "@/lib/plans/entitlements-enabled";
export const instant = false;
import { readPlaqueEntitlement, canAddPlaque } from "@/lib/plans/plaque-entitlement";
import PlaqueAllowance from "@/components/plans/plaque-allowance";

import Link from "next/link";
import NewPlaqueForm from "./new-plaque-form";
import AppShell from "@/app/components/app-shell";
import { requireSubscription } from "@/lib/require-subscription";

export default async function NewPlaquePage() {
  const { business } = await requireSubscription();

  const entitlement = plaqueEntitlementsEnabled() ? await readPlaqueEntitlement(business.id) : null;

  return (
    <AppShell businessName={business.name}>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/plaques"
          className="text-sm font-medium text-slate-500 transition hover:text-[#17324d]"
        >
          ← Back to My Plaques
        </Link>

        <div className="mt-6 mt-panel p-6 sm:p-8">
          <p className="mt-kicker">
            Plaques
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Add Plaque
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Create a new smart plaque for {business.name}.
          </p>

          {!entitlement || canAddPlaque(entitlement) ? <NewPlaqueForm /> : <PlaqueAllowance entitlement={entitlement} blocked/>}
        </div>
      </div>
    </AppShell>
  );
}