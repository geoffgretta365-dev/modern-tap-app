import ReviewPlaqueBenefit from "@/components/plans/review-plaque-benefit";
import Link from "next/link";
import { PLANS, CORE_SOFTWARE_FEATURES, displayPrice, plaqueRange, planBenefits } from "@/lib/plans/catalog";
import type { PlanPrice } from "@/lib/plans/stripe-prices";

export default function PlanSelector({ prices, canChoose = true }: { prices: Record<string, PlanPrice>; canChoose?: boolean }) {
  const plans = [...PLANS].sort((a, b) => a.sortOrder - b.sortOrder);
  const custom = plans.find(plan => plan.custom)!;
  return <>
    <h1 className="text-3xl font-bold tracking-tight text-[#17324d] sm:text-4xl">Choose Your ModernTap Plan</h1>
    <p className="mt-3 max-w-2xl text-slate-600">Every plan includes the complete ModernTap software. Choose the plan that matches the number of plaques your business needs.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{plans.filter(plan => !plan.custom).map(plan => <section key={plan.key} className="mt-panel flex min-w-0 flex-col p-5">
      <h2 className="text-xl font-bold text-[#17324d]">{plan.name}</h2>
      <p className="mt-4 text-4xl font-bold tracking-tight text-[#17324d]">{displayPrice(plan)}</p><p className="mt-1 text-sm text-slate-500">per month</p>
      <p className="mt-4 text-lg font-semibold text-[#17324d]">{plaqueRange(plan)}</p>
      <p className="mt-5 text-lg font-bold text-[#0f766e]">{plan.initialPlaqueDiscountPercent}% OFF<span className="block text-xs font-normal text-slate-500">your initial plaque order</span></p>
      <ReviewPlaqueBenefit plan={plan}/><ul className="my-6 space-y-3 text-sm text-slate-600">{planBenefits(plan).slice(1).map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
      {canChoose ? <Link href={`/plans/${plan.key}/review`} className="mt-primary-action mt-auto">Choose {plan.name}</Link> : <p className="mt-auto text-xs text-slate-500">Manage your existing subscription below.</p>}
      {canChoose && !prices[plan.key]?.available && <p className="mt-3 text-xs text-slate-500">Checkout unavailable — price configuration pending.</p>}
    </section>)}</div>
    <section className="mt-5 border-y border-slate-200 py-5 sm:flex sm:items-center sm:justify-between sm:gap-8"><div><h2 className="text-xl font-bold text-[#17324d]">{custom.name} · {plaqueRange(custom)}</h2><p className="mt-2 max-w-2xl text-sm text-slate-600">{custom.description}</p><ReviewPlaqueBenefit plan={custom}/></div><p className="mt-3 shrink-0 font-semibold text-[#0f766e]">Contact ModernTap<span className="mt-1 block text-xs font-normal text-slate-500">Arrange a plan with your ModernTap representative.</span></p></section>
    <section className="mt-7"><h2 className="font-semibold text-[#17324d]">Every plan includes complete ModernTap software</h2><ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">{CORE_SOFTWARE_FEATURES.map(feature => <li key={feature}>✓ {feature}</li>)}</ul></section>
    <p className="mt-6 max-w-3xl text-xs leading-5 text-slate-500">Design-change and replacement allowances renew per subscription year. Design changes update an existing plaque design. Included replacements are for eligible existing ModernTap plaques. The initial-order discount applies only to the plaque order associated with starting your subscription. Physical plaque orders are billed separately.</p>
  </>;
}
