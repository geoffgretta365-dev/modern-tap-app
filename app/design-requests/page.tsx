export const instant = false;

import AppShell from "@/app/components/app-shell";
import { requireSubscription } from "@/lib/require-subscription";
import { formatEasternDateTime } from "@/lib/format-eastern-time";
import { type DesignRequestStatus } from "@/lib/design-requests";
import DesignRequestForm from "./request-form";

const statusPresentation: Record<DesignRequestStatus, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-slate-100 text-slate-700" },
  reviewing: { label: "Reviewing", className: "bg-amber-50 text-amber-800" },
  designing: { label: "Designing", className: "bg-sky-50 text-sky-800" },
  ready: { label: "Ready", className: "mt-badge-teal" },
  completed: { label: "Completed", className: "mt-badge-teal" },
  declined: { label: "Declined", className: "bg-slate-100 text-slate-700" },
};

export default async function DesignRequestsPage() {
  const { supabase, business } = await requireSubscription();
  const { data: plaques, error: plaquesError } = await supabase.from("plaques")
    .select("id, name").eq("business_id", business.id).order("name");
  if (plaquesError) throw plaquesError;
  const { data: requests, error: requestsError } = await supabase.from("design_change_requests")
    .select("id, plaque_id, notes, inspiration_url, status, created_at")
    .eq("business_id", business.id).order("created_at", { ascending: false });
  if (requestsError) throw requestsError;
  const names = new Map((plaques ?? []).map((plaque) => [plaque.id, plaque.name]));

  return <AppShell businessName={business.name}>
    <div className="mx-auto max-w-[1280px] space-y-8">
      <header>
        <p className="mt-kicker">Design Support</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17324d] sm:text-4xl">Design Requests</h1>
        <p className="mt-2 text-sm text-slate-600">Request an updated plaque design and track your existing requests.</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">Your active plaques continue working while design changes are being prepared.</p>
      </header>
      <section className="rounded-2xl border border-[#dbe4ea] bg-[#f3f7f9] p-5 sm:p-6" aria-labelledby="design-process-heading">
        <h2 id="design-process-heading" className="font-semibold text-[#17324d]">How design requests work</h2>
        <ol className="mt-4 grid gap-5 md:grid-cols-3">
          {[
            { title: "Select a Plaque", detail: "Choose the plaque you want updated." },
            { title: "Describe the Change", detail: "Tell us what you would like changed and optionally share a reference." },
            { title: "Track the Request", detail: "Follow the request status from your ModernTap account." },
          ].map((step, index) => <li key={step.title} className="flex min-w-0 gap-3">
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#0f8f8a]">{index + 1}</span>
            <div><h3 className="text-xs font-semibold uppercase tracking-wide text-[#17324d]">{step.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p></div>
          </li>)}
        </ol>
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <DesignRequestForm plaques={plaques ?? []} />
        <section className="mt-panel min-w-0 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#17324d]">Your Design Requests</h2>
          <p className="mt-1 text-sm text-slate-500">Track the status and details of design changes you&apos;ve requested.</p>
          {!requests?.length ? <div className="mt-6 rounded-xl border border-dashed border-[#dbe4ea] p-5 text-center text-sm">
            <p className="font-semibold text-[#17324d]">No design requests yet.</p>
            <p className="mt-2 leading-6 text-slate-500">Requests you submit will appear here so you can follow their status.</p>
          </div> :
            <div className="mt-5 divide-y divide-[#dbe4ea]">{requests.map((item) => {
              const status = statusPresentation[item.status as DesignRequestStatus] ?? {
                label: item.status.replace(/_/g, " "), className: "bg-slate-100 text-slate-700",
              };
              return <article key={item.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 break-words font-semibold text-[#17324d] [overflow-wrap:anywhere]">{names.get(item.plaque_id) ?? "Plaque"}</p>
                  <span className={`max-w-full break-words rounded-full px-3 py-1 text-xs font-semibold capitalize ${status.className}`}>{status.label}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Submitted <time dateTime={item.created_at}>{formatEasternDateTime(item.created_at)}</time></p>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Requested Changes</h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{item.notes}</p>
                {item.inspiration_url && <a href={item.inspiration_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#0f8f8a] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]">View Reference ↗</a>}
              </article>;
            })}</div>}
        </section>
      </div>
    </div>
  </AppShell>;
}
