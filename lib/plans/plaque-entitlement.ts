import { plaqueEntitlementsEnabled } from "@/lib/plans/entitlements-enabled";
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan, PLANS } from "@/lib/plans/catalog";

export type PlaqueEntitlement = { activeCount: number; maximum: number | null; planKey: string | null; configured: boolean };
export async function readPlaqueEntitlement(businessId: string): Promise<PlaqueEntitlement> {
  if (!plaqueEntitlementsEnabled()) return { activeCount: 0, maximum: null, planKey: null, configured: false };
  const { data, error } = await createAdminClient().rpc("plaque_entitlement", { p_business_id: businessId });
  if (error || !data || !Number.isInteger(data.activeCount)) {
    return { activeCount: 0, maximum: null, planKey: null, configured: false };
  }
  return { activeCount: data.activeCount, maximum: data.maximum, planKey: data.planKey, configured: Number.isInteger(data.maximum) && data.maximum > 0 };
}
export function capacityMessage(entitlement: PlaqueEntitlement) {
  if (!entitlement.configured) return "Plaque activation is unavailable until your subscription allowance is configured. Contact ModernTap.";
  const plan = getPlan(entitlement.planKey);
  const next = PLANS.find(p => !p.custom && p.maximumPlaques! > entitlement.maximum!);
  return `You've reached the ${entitlement.maximum}-plaque limit on ModernTap ${plan?.name ?? "your plan"}. ${next ? `Upgrade to ${next.name} to activate more plaques.` : "Contact ModernTap for a custom allowance."}`;
}
export function canAddPlaque(entitlement: PlaqueEntitlement) {
  return entitlement.configured && entitlement.maximum !== null && entitlement.activeCount < entitlement.maximum;
}
