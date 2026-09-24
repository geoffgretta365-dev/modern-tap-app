export const instant = false;

import { notFound } from "next/navigation";
import Link from "next/link";
import DestinationForm from "./destination-form";
import SmartPageEditor from "./smart-page-editor";
import PlaquePurposeForm from "./plaque-purpose-form";
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
      purpose,
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
    .select("id, heading, subheading, logo_path, updated_at, theme_preset, background_color, text_color, button_color, button_text_color, button_style, button_radius, presentation_version, page_background_color, background_mode, gradient_end_color, gradient_direction, logo_size, content_alignment")
    .eq("plaque_id", plaque.id)
    .maybeSingle();
  if (smartPageError) throw smartPageError;

  const { data: buttons, error: buttonsError } = smartPage
    ? await supabase.from("smart_page_buttons")
        .select("id, label, destination_url, enabled, position, icon_key, image_path, updated_at")
        .eq("smart_page_id", smartPage.id)
        .order("position", { ascending: true })
        .order("id", { ascending: true })
    : { data: [], error: null };
  if (buttonsError) throw buttonsError;

  return (
    <AppShell businessName={business?.name}>
      <div className="mx-auto max-w-6xl">

        <Link
          href="/plaques"
          className="text-sm font-semibold text-slate-500 hover:text-[#17324d]"
        >
          ← Back to My Plaques
        </Link>

        <div className="mt-6">
          <div className="flex items-center gap-3">

            <h1 className="text-3xl font-bold tracking-tight text-[#17324d]">
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

        <PlaquePurposeForm plaqueId={plaque.id} initialPurpose={plaque.purpose} />

        <SmartPageEditor
          plaqueId={plaque.id}
          plaqueCode={plaque.code}
          initialMode={plaque.mode}
          page={smartPage}
          buttons={buttons ?? []}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.5fr]">

          <section className="mt-panel p-6">

            <p className="mt-kicker">
              Plaque Details
            </p>

            <div className="mt-6 space-y-5">

              <div>
                <p className="text-sm font-medium text-slate-500">
                  Plaque Code
                </p>

                <p className="mt-1 font-mono text-base font-semibold text-[#17324d]">
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

          {plaque.mode === "direct_link" && <section className="mt-panel p-6">

            <p className="mt-kicker">
              Destination
            </p>

            <h2 className="mt-2 text-xl font-bold text-[#17324d]">
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
