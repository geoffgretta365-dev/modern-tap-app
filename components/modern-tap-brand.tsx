import Image from "next/image";
import Link from "next/link";
import ModernTapMark from "@/components/modern-tap-mark";

export default function ModernTapBrand({
  href = "/dashboard",
  compact = false,
  dark = false,
  onClick,
}: {
  href?: string;
  compact?: boolean;
  dark?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-label="ModernTap home"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center justify-center focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0] ${dark ? compact ? "w-44" : "w-52" : compact ? "w-28 min-[380px]:w-40 sm:w-44" : "w-52"}`}
    >
      {dark ? (
        <span className="flex w-full items-center justify-center gap-1.5 whitespace-nowrap">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden="true">
            <ModernTapMark className="h-9 w-9" aria-label={undefined} />
          </span>
          <span className={`font-bold tracking-tight ${compact ? "text-xl" : "text-2xl"}`}>
            <span className="text-white">Modern</span><span className="text-[#16c7c0]">Tap</span>
          </span>
        </span>
      ) : (
        <Image src="/modern-tap-logo.png" alt="ModernTap" width={2172} height={724}
          sizes={compact ? "(min-width: 640px) 176px, (min-width: 380px) 160px, 112px" : "208px"}
          priority className="block h-auto w-full" />
      )}
    </Link>
  );
}
