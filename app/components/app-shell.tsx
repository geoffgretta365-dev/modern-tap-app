"use client";

import Link from "next/link";
import ModernTapBrand from "@/components/modern-tap-brand";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "▦" },
  { name: "My Plaques", href: "/plaques", icon: "◫" },
  { name: "Analytics", href: "/analytics", icon: "↗" },
  { name: "Billing", href: "/billing", icon: "$" },
  { name: "Support", href: "/support", icon: "?" },
  { name: "Replacements", href: "/replacements", icon: "↻" },
  { name: "Design Requests", href: "/design-requests", icon: "✦" },
  { name: "Settings", href: "/settings", icon: "⚙" },
];

export default function AppShell({
  children,
  businessName,
}: {
  children: ReactNode;
  businessName?: string;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="mt-app-background min-h-screen">
      <aside className="mt-shell-sidebar fixed inset-y-0 left-0 hidden w-64 border-r lg:flex lg:flex-col">
        <div className="flex h-20 items-center justify-center border-b border-white/15 px-5">
          <ModernTapBrand dark />
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`mt-shell-nav-link flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#17324d] ${
                  active
                    ? "mt-shell-nav-active"
                    : "mt-shell-nav-inactive"
                }`}
              >
                <span className="flex w-5 justify-center text-base text-[#6de6df]">
                  {item.icon}
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/15 p-4">
          <div className="mt-shell-account rounded-xl border p-4">
            <p className="truncate text-sm font-semibold text-white">
              {businessName || "ModernTap Account"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Customer Portal
            </p>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              <span className="w-5 text-center">↪</span>
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      <div className="mt-shell-canvas min-h-screen lg:pl-64">
        <header className="mt-shell-header sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-[#dbe4ea] bg-white text-xl text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
            >
              ☰
            </button>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:hidden">
            <ModernTapBrand compact />
          </div>

          <div className="hidden lg:block">
            <p className="text-sm font-medium text-slate-500">
              {businessName || "ModernTap"}
            </p>
          </div>

          <Link
            href="/plaques/new"
            className="mt-primary-action relative z-10 px-2.5 text-xs min-[380px]:px-3 sm:px-4 sm:text-sm"
          >
            + Add Plaque
          </Link>
        </header>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-[#17324d]/55"
            />

            <div className="mt-shell-sidebar relative flex h-full w-72 max-w-[85vw] flex-col shadow-2xl">
              <div className="flex h-16 items-center justify-between border-b border-white/15 px-5">
                <ModernTapBrand compact dark onClick={() => setMobileMenuOpen(false)} />

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  ×
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
                {navigation.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(`${item.href}/`));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`mt-shell-nav-link flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                        active
                          ? "mt-shell-nav-active"
                          : "mt-shell-nav-inactive"
                      }`}
                    >
                      <span className="flex w-5 justify-center text-base">
                        {item.icon}
                      </span>
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-white/15 p-4">
                <div className="mt-shell-account rounded-xl border p-4">
                  <p className="truncate text-sm font-semibold text-white">
                    {businessName || "ModernTap Account"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Customer Portal
                  </p>
                </div>

                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                  >
                    <span className="w-5 text-center">↪</span>
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null}

        <main className="mt-main-content min-w-0 p-5 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
