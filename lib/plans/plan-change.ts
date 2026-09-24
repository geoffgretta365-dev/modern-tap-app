import type { Plan } from "./catalog";
export function planChangeIssue(current: Plan | undefined, target: Plan | undefined, activeCount: number): string | null {
  if (!current || current.custom) return "Contact ModernTap to change a custom or legacy subscription.";
  if (!target || target.custom) return "Custom plans require a manually configured agreement with ModernTap.";
  if (current.key === target.key) return "This is your current plan.";
  if (activeCount > target.maximumPlaques!) return `${target.name} supports up to ${target.maximumPlaques} active plaques. Deactivate at least ${activeCount - target.maximumPlaques!} plaques before switching to ${target.name}.`;
  if (target.maximumPlaques! < current.maximumPlaques!) return "Contact ModernTap to arrange an end-of-period downgrade. Automatic downgrades are not available yet.";
  return null;
}
