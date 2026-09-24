export const instant = false;
import { requirePreSubscriptionBusiness } from "@/lib/customer-journey";
import { redirect } from "next/navigation";

export default async function PlansPage() {
  await requirePreSubscriptionBusiness();
  redirect("/billing");
}
