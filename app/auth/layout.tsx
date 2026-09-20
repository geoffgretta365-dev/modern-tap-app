import type { ReactNode } from "react";
import ModernTapBrand from "@/components/modern-tap-brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mt-auth min-h-svh">
      <div className="mx-auto flex max-w-sm justify-center pt-10">
        <ModernTapBrand href="/" />
      </div>
      {children}
    </div>
  );
}
