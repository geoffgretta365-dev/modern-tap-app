export const instant = false;
import { requirePreSubscriptionBusiness } from "@/lib/customer-journey";
import TourShell from "@/components/tour/tour-shell";
export default async function TourPage() {
  await requirePreSubscriptionBusiness();
  return <TourShell />;
}
