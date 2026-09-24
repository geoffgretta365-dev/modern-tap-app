import { Star } from "lucide-react";
import { googleReviewBenefit, type Plan } from "@/lib/plans/catalog";
export default function ReviewPlaqueBenefit({ plan }: { plan: Plan }) {
  return <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#c8dfda] bg-[#f0f8f5] p-3 text-[#204d42]">
    <Star aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5}/><div><p className="text-sm font-semibold leading-5">{googleReviewBenefit(plan)}</p><p className="mt-1 text-xs leading-5">Physical ModernTap plaque/card for your review destination.</p></div>
  </div>;
}
