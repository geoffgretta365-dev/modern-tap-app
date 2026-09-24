import { Camera, Users, Music2, Play, Globe, UtensilsCrossed, Star, ShoppingBag, CalendarDays, Phone, Mail, MapPin, Store } from "lucide-react";

// Generic Lucide action symbols, not official social brand assets.
// Persisted keys stay compatible with the deployed 13-key CHECK constraint.
export const SMART_PAGE_ICONS = {
  instagram: { label: "Instagram / photo social", Icon: Camera },
  facebook: { label: "Facebook / community / membership", Icon: Users },
  tiktok: { label: "TikTok", Icon: Music2 },
  youtube: { label: "YouTube / video", Icon: Play },
  website: { label: "Website / information", Icon: Globe },
  menu: { label: "Menu", Icon: UtensilsCrossed },
  reviews: { label: "Reviews", Icon: Star },
  order: { label: "Order", Icon: ShoppingBag },
  reservation: { label: "Booking / calendar", Icon: CalendarDays },
  phone: { label: "Phone", Icon: Phone },
  email: { label: "Email / contact", Icon: Mail },
  directions: { label: "Directions", Icon: MapPin },
  shop: { label: "Shop / services", Icon: Store },
} as const;
export type SmartPageIconKey = keyof typeof SMART_PAGE_ICONS;
export function isSmartPageIconKey(value: unknown): value is SmartPageIconKey {
  return typeof value === "string" && Object.hasOwn(SMART_PAGE_ICONS, value);
}
