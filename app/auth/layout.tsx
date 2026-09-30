import type { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="mt-auth flex min-h-svh items-center justify-center bg-[#f3f7f9] px-4 py-8 sm:px-6 sm:py-12">
    <div className="w-full min-w-0 max-w-md">
      <header className="mb-6 text-center">
        <Image src="/modern-tap-logo.png" alt="ModernTap" width={2172} height={724} sizes="208px" priority className="mx-auto h-auto w-52 max-w-full" />
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0f8f8a]">Business Portal</p>
      </header>
      {children}
    </div>
  </main>;
}
