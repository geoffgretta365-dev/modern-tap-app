export const instant = false;

import Link from "next/link";
import AppShell from "@/app/components/app-shell";
import { requireSubscription } from "@/lib/require-subscription";

export default async function PlaquesPage() {
  const { supabase, business } = await requireSubscription();

  const { data: plaques } = await supabase
    .from("plaques")
    .select("id, name, code, destination_url, active, mode, purpose")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const smartPlaqueIds = (plaques ?? []).filter((plaque) => plaque.mode === "smart_page").map((plaque) => plaque.id);
  const { data: smartPages, error: pagesError } = smartPlaqueIds.length
    ? await supabase.from("smart_pages").select("id, plaque_id").in("plaque_id", smartPlaqueIds)
    : { data: [], error: null };
  if (pagesError) throw pagesError;
  const pageIds = (smartPages ?? []).map((page) => page.id);
  const { data: buttons, error: buttonsError } = pageIds.length
    ? await supabase.from("smart_page_buttons")
        .select("smart_page_id, destination_url").in("smart_page_id", pageIds).eq("enabled", true)
    : { data: [], error: null };
  if (buttonsError) throw buttonsError;
  const usablePages = new Set((buttons ?? []).filter((button) => validDestination(button.destination_url)).map((button) => button.smart_page_id));
  const readyPlaques = new Set((smartPages ?? []).filter((page) => usablePages.has(page.id)).map((page) => page.plaque_id));

  return (
    <AppShell businessName={business.name}>
      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mt-kicker">
              Plaques
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17324d] sm:text-4xl">
              My Plaques
            </h1>

            <p className="mt-2 text-slate-500">
              Manage every smart plaque connected to {business.name}.
            </p>
          </div>

          <Link
            href="/plaques/new"
            className="w-fit rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            + Add New Plaque
          </Link>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">

          {plaques?.map((plaque) => {
            const health = !plaque.active ? "Inactive"
              : plaque.mode === "smart_page"
                ? readyPlaques.has(plaque.id) ? "Ready" : "Needs attention"
                : validDestination(plaque.destination_url) ? "Ready" : "Needs attention";
            return (
            <article
              key={plaque.id}
              className="mt-panel p-6 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-5">

                <div className="min-w-0">

                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        plaque.active
                          ? "bg-[#16c7c0]"
                          : "bg-slate-300"
                      }`}
                    />

                    <h2 className="truncate text-xl font-bold text-[#17324d]">
                      {plaque.name}
                    </h2>
                  </div>

                  <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    plaque.mode === "smart_page"
                      ? "mt-badge-teal"
                      : "mt-badge-neutral"
                  }`}>
                    {plaque.mode === "smart_page" ? "Smart Page" : "Direct Link"}
                  </span>

                  {plaque.purpose === "review" && <span className="ml-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold mt-badge-teal">Review Card</span>}
                  <span className={`ml-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${health === "Ready" ? "mt-badge-teal" : "mt-badge-neutral"}`}>{health}</span>

                  <p className="mt-2 font-mono text-xs text-slate-400">
                    {plaque.code}
                  </p>

                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    plaque.active
                      ? "mt-badge-teal"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {plaque.active ? "Active" : "Inactive"}
                </span>

              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">

                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Current Destination
                </p>

                <p className="mt-2 break-all text-sm leading-6 text-slate-700">
                  {plaque.destination_url}
                </p>

              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">

                <p className="text-xs font-medium text-slate-400">
                  Permanent ModernTap Link
                </p>

                <p className="mt-1 break-all font-mono text-sm font-medium text-slate-800">
                  /t/{plaque.code}
                </p>

              </div>

              <div className="mt-5 flex items-center justify-between">

                <p className="text-xs text-slate-400">
                  {health === "Needs attention" ? "Check this plaque's destination or Smart Page buttons" : health === "Inactive" ? "Currently disabled" : "Ready to receive taps"}
                </p>

                <Link
                  href={`/plaques/${plaque.id}`}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Manage →
                </Link>

              </div>
            </article>
          );})}

        </div>

        {(!plaques || plaques.length === 0) && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
              ◫
            </div>

            <h2 className="mt-4 text-lg font-bold text-[#17324d]">
              No plaques yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create your first smart plaque and connect it to any
              destination URL.
            </p>

            <Link
              href="/plaques/new"
              className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              + Add Your First Plaque
            </Link>

          </div>
        )}

      </div>
    </AppShell>
  );
}

function validDestination(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}
