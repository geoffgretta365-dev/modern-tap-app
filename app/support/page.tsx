export const instant = false;

import AppShell from "@/app/components/app-shell";
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
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Help Center
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Support
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Having an issue with a plaque, your account, billing, or ModernTap
            software? Send us a request and we’ll help you get it resolved.
          </p>
        </div>

        <SupportForm businessId={business.id} plaques={plaques ?? []} />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
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
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {ticket.subject}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {ticket.category} ·{" "}
                      {new Date(ticket.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
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