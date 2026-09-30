export const instant = false;

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminAccess } from "@/lib/admin-access";
import { adminPilotResults } from "@/lib/pilot-results-server";
import { PilotResultsView } from "@/components/pilots/results-view";
import { PilotReviewForm } from "@/components/pilots/admin-result-controls";

export default async function AdminPilotResultsPage({ params }: { params: Promise<{ businessId: string }> }) {
  if (!await adminAccess()) redirect("/auth/login");
  const { businessId } = await params;
  const results = await adminPilotResults(businessId);
  if (!results) notFound();
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
    <div className="mx-auto max-w-2xl">
      <Link href={`/admin/businesses/${businessId}`} className="mb-6 inline-block text-sm font-semibold text-slate-600 underline">← Back to business</Link>
      <PilotResultsView results={results} />
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold text-[#17324d]">Record final review results</h2>
        <PilotReviewForm businessId={businessId} reviews={results.reviewsEnd} rating={results.ratingEnd} />
      </section>
    </div>
  </main>;
}
