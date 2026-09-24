"use client";

import { useState } from "react";

export default function SmartPageLogo({ src, size, alignment = "center", treatment = "bare" }: { src: string; size?: "small" | "medium" | "large"; alignment?: "center" | "left"; treatment?: "bare" | "card" | "circle" }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  if (size) {
    const width = { small: 96, medium: 160, large: 200 }[size];
    return <div className={`${alignment === "center" ? "mx-auto" : ""} mb-6 flex max-w-full items-center justify-center ${treatment === "circle" ? "rounded-full bg-white p-4" : treatment === "card" ? "rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/10" : ""}`} style={{ width, ...(treatment === "circle" ? { aspectRatio: "1" } : {}) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Business logo" width={160} height={160} loading="eager" onError={() => setFailed(true)} className="h-auto w-auto max-w-full object-contain" style={{ maxWidth: width, maxHeight: { small: 72, medium: 128, large: 160 }[size] }}/>
    </div>;
  }
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
