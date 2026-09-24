// Fictional tour-only data. Never seed these interactions into customer tables.
export const DEMO_BUSINESS = "Cedar & Stone Café";
export const DEMO_PLAQUES = [
  { id: "counter", name: "Front Counter", mode: "Smart Page", destination: "Your branded menu & links", taps: 84 },
  { id: "review", name: "Review Card — Register", mode: "Direct Link", destination: "example.com/cedar-stone/reviews", taps: 63 },
  { id: "menu", name: "Main Menu", mode: "Direct Link", destination: "example.com/cedar-stone/menu", taps: 49 },
  { id: "patio", name: "Patio Table", mode: "Direct Link", destination: "example.com/cedar-stone/patio", taps: 35 },
  { id: "events", name: "Catering & Events", mode: "Smart Page", destination: "Catering choices & contact", taps: 28 },
  { id: "social", name: "Loyalty / Social", mode: "Smart Page", destination: "Social links & loyalty", taps: 21 },
] as const;
export const DEMO_DAYS = [22, 34, 28, 41, 53, 67, 35];
export const DEMO_ACTIONS = [
  { label: "View Our Menu", icon: "menu" },
  { label: "Leave a Review", icon: "reviews" },
  { label: "Follow on Instagram", icon: "instagram" },
  { label: "Contact Us", icon: "website" },
] as const;
export const DEMO_ACTIVITY = ["Front Counter · View Our Menu selected", "Main Menu · Plaque tapped", "Review Card — Register · Plaque tapped"];
