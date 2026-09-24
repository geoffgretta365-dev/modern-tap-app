export const CORE_SOFTWARE_FEATURES = [
  "ModernTap Dashboard", "Plaque management", "Direct Link plaques", "Smart Pages",
  "Tap & plaque performance analytics", "Smart Page action analytics",
  "Customer activity insights", "Destination management / changes",
  "Design, support & replacement requests",
] as const;

export type Plan = {
  key: string;
  name: string;
  monthlyPrice: number | null;
  currency: "usd";
  billingInterval: "month";
  minimumPlaques: number;
  maximumPlaques: number | null;
  initialPlaqueDiscountPercent: number | null;
  designChangesPerYear: number | null;
  replacementPlaquesPerYear: number | null;
  googleReviewPlaques: number | null;
  support: string;
  coreSoftwareFeatures: readonly string[];
  description: string;
  sortOrder: number;
  custom: boolean;
};

// Approved customer-facing terms. Stripe IDs and their environment mapping stay server-only.
export const PLANS: readonly Plan[] = [
  { key: "starter", googleReviewPlaques: 0, name: "Starter", monthlyPrice: 9.99, minimumPlaques: 1, maximumPlaques: 5, initialPlaqueDiscountPercent: 5, designChangesPerYear: 1, replacementPlaquesPerYear: 1, support: "Standard Support", description: "For businesses starting with a few plaques.", sortOrder: 1, custom: false },
  { key: "growth", googleReviewPlaques: 1, name: "Growth", monthlyPrice: 14.99, minimumPlaques: 6, maximumPlaques: 10, initialPlaqueDiscountPercent: 10, designChangesPerYear: 2, replacementPlaquesPerYear: 1, support: "Standard Support", description: "For businesses connecting more customer touchpoints.", sortOrder: 2, custom: false },
  { key: "pro", googleReviewPlaques: 1, name: "Pro", monthlyPrice: 19.99, minimumPlaques: 11, maximumPlaques: 20, initialPlaqueDiscountPercent: 12.5, designChangesPerYear: 4, replacementPlaquesPerYear: 2, support: "Priority Support", description: "For businesses with a larger plaque network.", sortOrder: 3, custom: false },
  { key: "business", googleReviewPlaques: 2, name: "Business", monthlyPrice: 24.99, minimumPlaques: 21, maximumPlaques: 30, initialPlaqueDiscountPercent: 15, designChangesPerYear: 6, replacementPlaquesPerYear: 3, support: "Highest Priority Support", description: "For businesses managing plaques at scale.", sortOrder: 4, custom: false },
  { key: "custom", googleReviewPlaques: null, name: "Custom", monthlyPrice: null, minimumPlaques: 31, maximumPlaques: null, initialPlaqueDiscountPercent: null, designChangesPerYear: null, replacementPlaquesPerYear: null, support: "Negotiated support", description: "Pricing, initial plaque discount, design changes, replacements, and support tailored to your business.", sortOrder: 5, custom: true },
].map(plan => ({ ...plan, currency: "usd", billingInterval: "month", coreSoftwareFeatures: CORE_SOFTWARE_FEATURES }));

export function getPlan(key: unknown): Plan | undefined {
  return typeof key === "string" ? PLANS.find(plan => plan.key === key) : undefined;
}
export function plaqueRange(plan: Plan) {
  return `${plan.minimumPlaques}${plan.maximumPlaques === null ? "+" : `–${plan.maximumPlaques}`} active plaques`;
}
export function displayPrice(plan: Plan) {
  return plan.monthlyPrice === null ? "Contact ModernTap" : new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency }).format(plan.monthlyPrice);
}
export function planBenefits(plan: Plan) {
  return [plaqueRange(plan),
    plan.designChangesPerYear === null ? "Design changes negotiated" : `${plan.designChangesPerYear} included design ${plan.designChangesPerYear === 1 ? "change" : "changes"} per subscription year`,
    plan.replacementPlaquesPerYear === null ? "Replacement allowance negotiated" : `${plan.replacementPlaquesPerYear} included replacement ${plan.replacementPlaquesPerYear === 1 ? "plaque" : "plaques"} per subscription year`,
    plan.support];
}

export function googleReviewBenefit(plan: Plan) {
  return plan.googleReviewPlaques === null ? "Google Review plaques: custom quantity · contact ModernTap"
    : plan.googleReviewPlaques === 0 ? "Google Review plaque available as an add-on"
    : `${plan.googleReviewPlaques} Google Review ${plan.googleReviewPlaques === 1 ? "plaque" : "plaques"} included`;
}
