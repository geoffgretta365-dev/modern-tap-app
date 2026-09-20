export const instant = false;

import AppShell from "@/app/components/app-shell";
import { formatEasternDate } from "@/lib/format-eastern-time";
import { requireSubscription } from "@/lib/require-subscription";
import ReplacementForm from "./replacement-form";

export default async function ReplacementsPage() {
  const { supabase, business } = await requireSubscription();

  const { data: plaques } = await supabase
    .from("plaques")
    .select("id, name")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const { data: requests } = await supabase
    .from("replacement_requests")
    .select(
      "id, reason, status, tracking_number, tracking_url, created_at, plaques(name)"
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell>
      <div className="mx-auto max-w-[1280px] space-y-8">
        <div>
          <p className="mt-kicker">
            Plaque Protection
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17324d]">
            Replacements
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Active ModernTap subscribers can request replacements for eligible
            lost, damaged, defective, or worn plaques.
          </p>
        </div>

        <ReplacementForm
          businessId={business.id}
          plaques={plaques ?? []}
        />

        <section className="mt-panel p-6">
          <h2 className="text-lg font-bold text-[#17324d]">
            Replacement History
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track the status of your replacement requests.
          </p>

          {!requests?.length ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No replacement requests yet.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {requests.map((request) => {
                const plaque = Array.isArray(request.plaques)
                  ? request.plaques[0]
                  : request.plaques;

                return (
                  <div
                    key={request.id}
                    className="rounded-xl border border-[#dbe4ea] bg-[#f8fcfd] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {plaque?.name ?? "Plaque replacement"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {request.reason} ·{" "}
                          {formatEasternDate(request.created_at, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })} ET
                        </p>
                      </div>

                      <span className="w-fit rounded-full mt-badge-neutral px-3 py-1 text-xs font-semibold capitalize">
                        {request.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    {request.tracking_number ? (
                      <p className="mt-3 text-sm text-slate-600">
                        Tracking:{" "}
                        {request.tracking_url ? (
                          <a
                            href={request.tracking_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-slate-900 underline"
                          >
                            {request.tracking_number}
                          </a>
                        ) : (
                          request.tracking_number
                        )}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}