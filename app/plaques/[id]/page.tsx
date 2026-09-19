export const instant = false;

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import DestinationForm from "./destination-form";
import AppShell from "@/app/components/app-shell";

export default async function PlaquePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: plaque } = await supabase
    .from("plaques")
    .select(`
      id,
      name,
      code,
      destination_url,
      active,
      businesses!inner (
        owner_id,
        name
      )
    `)
    .eq("id", id)
    .eq("businesses.owner_id", user.id)
    .single();

  if (!plaque) {
    notFound();
  }

  const business = Array.isArray(plaque.businesses)
    ? plaque.businesses[0]
    : plaque.businesses;

  return (
    <AppShell businessName={business?.name}>
      <div className="mx-auto max-w-4xl">

        <Link
          href="/plaques"
          className="text-sm font-semibold text-slate-500 hover:text-slate-950"
        >
          ← Back to My Plaques
        </Link>

        <div className="mt-6">
          <div className="flex items-center gap-3">

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              {plaque.name}
            </h1>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                plaque.active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {plaque.active ? "Active" : "Inactive"}
            </span>

          </div>

          <p className="mt-2 text-slate-500">
            Manage where this plaque sends customers.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.5fr]">

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Plaque Details
            </p>

            <div className="mt-6 space-y-5">

              <div>
                <p className="text-sm font-medium text-slate-500">
                  Plaque Code
                </p>

                <p className="mt-1 font-mono text-base font-semibold text-slate-950">
                  {plaque.code}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-5">

                <p className="text-sm font-medium text-slate-500">
                  Permanent ModernTap Link
                </p>

                <div className="mt-2 rounded-xl bg-slate-50 p-3">
                  <p className="break-all font-mono text-sm text-slate-800">
                    /t/{plaque.code}
                  </p>
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  This is the permanent link programmed into the physical plaque.
                </p>

              </div>
            </div>

          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Destination
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Tap Destination
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Change this URL anytime. The physical plaque does not need
              to be reprogrammed.
            </p>

            <DestinationForm
              plaqueId={plaque.id}
              currentUrl={plaque.destination_url}
            />

          </section>

        </div>
      </div>
    </AppShell>
  );
}