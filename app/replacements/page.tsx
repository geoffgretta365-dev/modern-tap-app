export const instant = false;

import AppShell from "@/app/components/app-shell";
import { formatEasternDate } from "@/lib/format-eastern-time";
import { requireSubscription } from "@/lib/require-subscription";
import ReplacementForm from "./replacement-form";

const statusStyle: Record<string, string> = {
  requested: "bg-slate-100 text-slate-700",
  approved: "bg-sky-50 text-sky-800",
  shipped: "mt-badge-teal",
  delivered: "mt-badge-teal",
};

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
      "id, reason, details, status, tracking_number, tracking_url, created_at, plaques(name)"
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell>
      <div className="mx-auto max-w-[1280px] space-y-8">
        <div>
          <p className="mt-kicker">
            Replacement Support
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17324d]">
            Replacement Requests
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Request a replacement plaque and track existing replacement or shipment status.
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Submit the plaque details and shipping information below so ModernTap can review your request.</p>
        </div>

        <section className="rounded-2xl border border-[#dbe4ea] bg-[#f3f7f9] p-5 sm:p-6" aria-labelledby="replacement-process-heading">
          <h2 id="replacement-process-heading" className="font-semibold text-[#17324d]">How replacements work</h2>
          <ol className="mt-4 grid gap-5 md:grid-cols-3">
            {[
              { title: "Select the Plaque", detail: "Choose the plaque that needs to be replaced." },
              { title: "Tell Us What Happened", detail: "Select a reason and add any helpful details." },
              { title: "Track the Request", detail: "Follow the request and shipment status from your ModernTap account." },
            ].map((step, index) => <li key={step.title} className="flex min-w-0 gap-3">
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#0f8f8a]">{index + 1}</span>
              <div><h3 className="text-xs font-semibold uppercase tracking-wide text-[#17324d]">{step.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p></div>
            </li>)}
          </ol>
        </section>

        <ReplacementForm
          businessId={business.id}
          plaques={plaques ?? []}
        />

        <section className="mt-panel min-w-0 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#17324d]">
            Your Replacement Requests
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track submitted requests and shipment updates.
          </p>

          {!requests?.length ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              <p className="font-semibold text-[#17324d]">No replacement requests yet.</p>
              <p className="mt-2 leading-6">Requests you submit will appear here so you can follow their status.</p>
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
                      <div className="min-w-0">
                        <p className="break-words [overflow-wrap:anywhere] font-semibold text-slate-900">
                          {plaque?.name ?? "Plaque replacement"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Submitted <time dateTime={request.created_at}>{formatEasternDate(request.created_at, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}</time> ET
                        </p>
                      </div>

                      <span className={`w-fit max-w-full shrink-0 break-words rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle[request.status] ?? "mt-badge-neutral"}`}>
                        {request.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <p className="mt-4 break-words text-sm text-slate-700"><span className="font-semibold">Reason:</span> {request.reason}</p>
                    {request.details && <div className="mt-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Additional Details</h3>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{request.details}</p>
                    </div>}
                    {request.tracking_number ? (
                      <div className="mt-4 border-t border-[#dbe4ea] pt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shipment</h3>
                        <p className="mt-2 break-words text-sm text-slate-600 [overflow-wrap:anywhere]">
                          Tracking:{" "}
                          {request.tracking_url ? (
                            <a
                              href={request.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block py-2 font-semibold text-[#0f8f8a] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
                            >
                              {request.tracking_number}
                            </a>
                          ) : (
                            request.tracking_number
                          )}
                        </p>
                      </div>
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