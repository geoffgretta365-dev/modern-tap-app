import { Instagram, Facebook, Music2, Youtube, Globe, UtensilsCrossed, Star, ShoppingBag, CalendarDays, Phone, Mail, MapPin, Store } from "lucide-react";

// Bundled artwork only; TikTok uses a music-note symbol, not a remote brand asset.
export const SMART_PAGE_ICONS = {
  instagram: { label: "Instagram", Icon: Instagram },
  facebook: { label: "Facebook", Icon: Facebook },
  tiktok: { label: "TikTok", Icon: Music2 },
  youtube: { label: "YouTube", Icon: Youtube },
  website: { label: "Website", Icon: Globe },
  menu: { label: "Menu", Icon: UtensilsCrossed },
  reviews: { label: "Reviews", Icon: Star },
  order: { label: "Order", Icon: ShoppingBag },
  reservation: { label: "Reservation", Icon: CalendarDays },
  phone: { label: "Phone", Icon: Phone },
  email: { label: "Email", Icon: Mail },
  directions: { label: "Directions", Icon: MapPin },
  shop: { label: "Shop", Icon: Store },
} as const;
export type SmartPageIconKey = keyof typeof SMART_PAGE_ICONS;
export function isSmartPageIconKey(value: unknown): value is SmartPageIconKey {
  return typeof value === "string" && Object.hasOwn(SMART_PAGE_ICONS, value);
}
