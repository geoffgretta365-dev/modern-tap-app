export const instant = false;

import AppShell from "@/app/components/app-shell";
import { requireSubscription } from "@/lib/require-subscription";
import { formatEasternDateTime } from "@/lib/format-eastern-time";
import DesignRequestForm from "./request-form";

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
        <p className="mt-kicker">Design Services</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17324d] sm:text-4xl">Design Requests</h1>
        <p className="mt-2 text-sm text-slate-600">Request a new design for one of your ModernTap plaques.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <DesignRequestForm plaques={plaques ?? []} />
        <section className="mt-panel min-w-0 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#17324d]">Request History</h2>
          <p className="mt-1 text-sm text-slate-500">Your current plaque keeps working while a new design is prepared.</p>
          {!requests?.length ? <p className="mt-6 rounded-xl border border-dashed border-[#dbe4ea] p-8 text-center text-sm text-slate-500">No design requests yet.</p> :
            <div className="mt-5 divide-y divide-[#dbe4ea]">{requests.map((item) =>
              <article key={item.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-[#17324d]">{names.get(item.plaque_id) ?? "Plaque"}</p>
                  <span className="mt-badge-teal rounded-full px-3 py-1 text-xs font-semibold capitalize">{item.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Submitted {formatEasternDateTime(item.created_at)}</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{item.notes}</p>
                {item.inspiration_url && <a href={item.inspiration_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block break-all text-sm font-semibold text-[#0f8f8a] underline">Reference ↗</a>}
              </article>)}</div>}
        </section>
      </div>
    </div>
  </AppShell>;
}
