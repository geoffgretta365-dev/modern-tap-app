import Link from "next/link";
import { getPlan, PLANS } from "@/lib/plans/catalog";
import { canAddPlaque, capacityMessage, type PlaqueEntitlement } from "@/lib/plans/plaque-entitlement";
export default function PlaqueAllowance({ entitlement, blocked = false }: { entitlement: PlaqueEntitlement; blocked?: boolean }) {
  const plan = getPlan(entitlement.planKey);
  const next = PLANS.find(p => !p.custom && p.maximumPlaques! > (entitlement.maximum ?? Infinity));
  const room = canAddPlaque(entitlement);
  return <section className="mt-6 rounded-xl border border-[#dbe4ea] bg-white p-5">
    <h2 className="font-semibold text-[#17324d]">{plan ? `${plan.name} Plan` : "Plaque Allowance"}</h2>
    {entitlement.configured && <><p className="mt-2 text-lg">{entitlement.activeCount} of {entitlement.maximum} plaques active</p><progress aria-label="Active plaque allowance" className="mt-3 h-2 w-full accent-[#0f8f8a]" max={entitlement.maximum!} value={Math.min(entitlement.activeCount, entitlement.maximum!)}/></>}
    {!room && <p className="mt-3 text-sm text-slate-600">{capacityMessage(entitlement)}</p>}
    <Link href={room && !blocked ? "/plaques/new" : "/billing/change-plan"} className="mt-primary-action mt-4">{room && !blocked ? "Add Plaque" : next ? `Upgrade to ${next.name}` : "Contact ModernTap"}</Link>
  </section>;
}
