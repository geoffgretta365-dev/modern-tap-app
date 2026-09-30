export const instant = false;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { sharedPilotResults } from "@/lib/pilot-results-server";
import { PilotResultsView } from "@/components/pilots/results-view";
import ModernTapBrand from "@/components/modern-tap-brand";

export const metadata: Metadata = {
  title: "Pilot results | ModernTap",
  description: "Your restaurant’s ModernTap pilot results.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SharedPilotPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const results = await sharedPilotResults(token);
  if (!results) notFound();
  return <main className="min-h-svh bg-[#f3f7f9] px-4 py-6 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 border-b border-slate-200 pb-5"><ModernTapBrand href="/" compact /></div>
      <PilotResultsView results={results} publicView />
      <footer className="mt-8 border-t border-slate-200 pt-5 text-center text-xs leading-6 text-slate-500">Powered by ModernTap · Everything, one tap away.</footer>
    </div>
  </main>;
}
