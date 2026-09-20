import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ModernTap",
    short_name: "ModernTap",
    description: "Manage ModernTap plaques, Smart Pages, engagement analytics, review tracking, and customer requests.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8fcfd",
    theme_color: "#17324d",
    icons: [
      { src: "/modern-tap-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/modern-tap-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/modern-tap-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
