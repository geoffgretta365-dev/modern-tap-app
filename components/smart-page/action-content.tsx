"use client";

import Image from "next/image";
import { useState } from "react";
import { isSmartPageIconKey, SMART_PAGE_ICONS } from "@/lib/smart-page-icons";

export default function ActionContent({ label, iconKey, imageSrc }: {
  label: string; iconKey?: string | null; imageSrc?: string | null;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const Icon = isSmartPageIconKey(iconKey) ? SMART_PAGE_ICONS[iconKey].Icon : null;
  const showImage = !!imageSrc && failedSrc !== imageSrc;
  if (!showImage && !Icon) return <>{label}</>;
  return <span className="flex w-full min-w-0 items-center justify-center gap-3">
    {showImage ? <Image unoptimized src={imageSrc!} alt="" width={32} height={32}
      className="h-8 w-8 shrink-0 object-contain" onError={() => setFailedSrc(imageSrc!)} />
      : Icon ? <Icon aria-hidden="true" className="h-8 w-8 shrink-0" /> : null}
    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{label}</span>
  </span>;
}
