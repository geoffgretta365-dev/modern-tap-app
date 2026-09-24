import type { Plan } from "@/lib/plans/catalog";

// Informational only. Not used to block creation, reactivate, or disable plaques.
// Unknown/Custom limits need an explicit agreement; null never means unlimited.
export function plaqueCapacity(plan: Plan | undefined, activePlaques: number) {
  const maximum = plan?.maximumPlaques ?? null;
  return { maximum, remaining: maximum === null ? null : Math.max(0, maximum - activePlaques) };
}
