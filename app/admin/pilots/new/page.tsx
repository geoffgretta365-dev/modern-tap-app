export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import { adminAccess } from "@/lib/admin-access";
import { NewPilotForm } from "./pilot-form";

export default async function NewPilotPage() {
  if (!await adminAccess()) redirect("/auth/login");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:p-10">
    <div className="mx-auto max-w-2xl">
      <Link href="/admin" className="text-sm font-semibold text-slate-600 underline">← Back to Admin Dashboard</Link>
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-900">Create a pilot restaurant</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Set up a free pilot, then add plaques and copy their tap URLs. No owner account or subscription is required.</p>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <NewPilotForm today={today} />
      </section>
    </div>
  </main>;
}
