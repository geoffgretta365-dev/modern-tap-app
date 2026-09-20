"use client";

import { useState } from "react";

export default function SmartPageLogo({ src }: { src: string }) {
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
    className="mx-auto mb-5 max-h-32 w-auto max-w-[160px] object-contain"
  />;
}
