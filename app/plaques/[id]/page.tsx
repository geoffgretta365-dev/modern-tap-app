export const instant = false;

import { notFound } from "next/navigation";
import Link from "next/link";
import DestinationForm from "./destination-form";
import SmartPageEditor from "./smart-page-editor";
import AppShell from "@/app/components/app-shell";
import { requireSubscription } from "@/lib/require-subscription";

export default async function PlaquePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, business: ownedBusiness } = await requireSubscription();

  const { data: plaque } = await supabase
    .from("plaques")
    .select(`
      id,
      name,
      code,
      destination_url,
      mode,
      active,
      businesses!inner (
        owner_id,
        name
      )
    `)
    .eq("id", id)
    .eq("business_id", ownedBusiness.id)
    .eq("businesses.owner_id", user.id)
    .single();

  if (!plaque) {
    notFound();
  }

  const business = Array.isArray(plaque.businesses)
    ? plaque.businesses[0]
    : plaque.businesses;

  const { data: smartPage, error: smartPageError } = await supabase
    .from("smart_pages")
    .select("id, heading, subheading")
    .eq("plaque_id", plaque.id)
    .maybeSingle();
  if (smartPageError) throw smartPageError;

  const { data: buttons, error: buttonsError } = smartPage
    ? await supabase.from("smart_page_buttons")
        .select("id, label, destination_url, enabled, position")
        .eq("smart_page_id", smartPage.id)
        .order("position", { ascending: true })
        .order("id", { ascending: true })
    : { data: [], error: null };
  if (buttonsError) throw buttonsError;

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

        <SmartPageEditor
          plaqueId={plaque.id}
          initialMode={plaque.mode}
          page={smartPage ? { heading: smartPage.heading, subheading: smartPage.subheading } : null}
          buttons={buttons ?? []}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.5fr]">

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

          {plaque.mode === "direct_link" && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

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

          </section>}

        </div>
      </div>
    </AppShell>
  );
}
