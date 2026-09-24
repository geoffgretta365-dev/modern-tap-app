import { displayPrice, planBenefits, type Plan } from "@/lib/plans/catalog";

export default function PlanSummary({ plan }: { plan: Plan }) {
  return <>
    <h2 className="text-2xl font-bold text-[#17324d]">ModernTap {plan.name}</h2>
    <p className="mt-4 text-3xl font-bold text-[#17324d]">{displayPrice(plan)}{!plan.custom && <span className="text-base font-normal text-slate-500"> / month</span>}</p>
    <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Your subscription includes</h3>
    <p className="mt-3 font-semibold text-[#17324d]">Complete ModernTap software</p>
    <ul className="mt-3 space-y-3 text-sm text-slate-600">{planBenefits(plan).map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
    <p className="mt-5 font-semibold text-[#0f766e]">{plan.initialPlaqueDiscountPercent === null ? "Initial plaque discount negotiated" : `Save ${plan.initialPlaqueDiscountPercent}% on your initial plaque order`}</p>
    <p className="mt-2 text-xs leading-5 text-slate-500">Physical plaque orders are billed separately. Design changes update an existing plaque design; included replacements are for eligible existing ModernTap plaques.</p>
  </>;
}
