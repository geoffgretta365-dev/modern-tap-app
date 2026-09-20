export const instant = false;

import AppShell from "@/app/components/app-shell";
import { formatEasternDate } from "@/lib/format-eastern-time";
import { requireSubscription } from "@/lib/require-subscription";
import SupportForm from "./support-form";

export default async function SupportPage() {
  const { supabase, business } = await requireSubscription();

  const { data: plaques } = await supabase
    .from("plaques")
    .select("id, name")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, category, subject, status, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell>
      <div className="mx-auto max-w-[1280px] space-y-8">
        <div>
          <p className="mt-kicker">
            Help Center
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17324d]">
            Support
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Having an issue with a plaque, your account, billing, or ModernTap
            software? Send us a request and we’ll help you get it resolved.
          </p>
        </div>

        <SupportForm businessId={business.id} plaques={plaques ?? []} />

        <section className="mt-panel p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#17324d]">
              Your Support Requests
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Track requests you’ve already submitted.
            </p>
          </div>

          {!tickets?.length ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              You haven’t submitted any support requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#dbe4ea] bg-[#f8fcfd] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {ticket.subject}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {ticket.category} ·{" "}
                      {formatEasternDate(ticket.created_at, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })} ET
                    </p>
                  </div>

                  <span className="w-fit rounded-full mt-badge-neutral px-3 py-1 text-xs font-semibold capitalize">
                    {ticket.status.replaceAll("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}