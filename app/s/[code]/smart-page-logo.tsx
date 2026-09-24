"use client";

import { useState } from "react";

export default function SmartPageLogo({ src, size, alignment = "center" }: { src: string; size?: "small" | "medium" | "large"; alignment?: "center" | "left" }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // This same-origin image route serves the private Storage object without an image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img
    src={src}
    alt="Business logo"
    width={160}
    height={160}
    loading="eager"
    onError={() => setFailed(true)}
    className={size ? `${alignment === "center" ? "mx-auto" : ""} mb-6 w-auto object-contain` : "mx-auto mb-5 max-h-32 w-auto max-w-[160px] object-contain"}
    style={size ? { maxWidth: { small: 96, medium: 160, large: 200 }[size], maxHeight: { small: 72, medium: 128, large: 160 }[size] } : undefined}
  />;
}
