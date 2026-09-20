"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "▦" },
  { name: "My Plaques", href: "/plaques", icon: "◫" },
  { name: "Analytics", href: "/analytics", icon: "↗" },
  { name: "Billing", href: "/billing", icon: "$" },
  { name: "Support", href: "/support", icon: "?" },
  { name: "Replacements", href: "/replacements", icon: "↻" },
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
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center border-b border-slate-100 px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-lg font-black text-white">
              M
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight">
                ModernTap
              </p>
              <p className="text-xs text-slate-400">
                Smart Plaque Platform
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
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
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
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

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="truncate text-sm font-semibold text-slate-900">
              {businessName || "ModernTap Account"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Customer Portal
            </p>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            >
              <span className="w-5 text-center">↪</span>
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-900 shadow-sm"
            >
              ☰
            </button>

            <Link href="/dashboard" className="font-bold">
              ModernTap
            </Link>
          </div>

          <div className="hidden lg:block">
            <p className="text-sm font-medium text-slate-500">
              {businessName || "ModernTap"}
            </p>
          </div>

          <Link
            href="/plaques/new"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
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
              className="absolute inset-0 bg-slate-950/40"
            />

            <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl">
              <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-bold text-slate-950"
                >
                  ModernTap
                </Link>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-100"
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
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                        active
                          ? "bg-slate-950 text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
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

              <div className="border-t border-slate-100 p-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {businessName || "ModernTap Account"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Customer Portal
                  </p>
                </div>

                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                  >
                    <span className="w-5 text-center">↪</span>
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null}

        <main className="p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
