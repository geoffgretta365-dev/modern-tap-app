export const instant = false;

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditBusinessForm } from "./edit-forms";

type Plaque = {
  id: string;
  name: string;
  code: string;
  destination_url: string | null;
  active: boolean;
  created_at: string;
};

type TapEvent = {
  plaque_id: string;
  created_at: string;
};

type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
};

type ReplacementRequest = {
  id: string;
  plaque_id: string | null;
  reason: string;
  status: string;
  created_at: string;
  tracking_number: string | null;
  tracking_url: string | null;
};

async function loadAllRows<T>(
  getPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await getPage(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function OverviewCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

export default async function AdminBusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const adminUserIds = (process.env.MODERNTAP_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!adminUserIds.includes(user.id)) {
    redirect("/dashboard");
  }

  const { businessId } = await params;
  const supabaseAdmin = createAdminClient();
  const { data: business, error: businessError } = await supabaseAdmin
    .from("businesses")
    .select("id, name, created_at")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError) throw businessError;
  if (!business) notFound();

  const { data: subscription, error: subscriptionError } = await supabaseAdmin
    .from("subscriptions")
    .select("status, stripe_customer_id, stripe_price_id, stripe_subscription_id, current_period_end, cancel_at, cancel_at_period_end, created_at")
    .eq("business_id", business.id)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;

  const [plaques, supportTickets, replacementRequests] = await Promise.all([
    loadAllRows<Plaque>((from, to) =>
      supabaseAdmin
        .from("plaques")
        .select("id, name, code, destination_url, active, created_at")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    loadAllRows<SupportTicket>((from, to) =>
      supabaseAdmin
        .from("support_tickets")
        .select("id, subject, category, status, created_at")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    loadAllRows<ReplacementRequest>((from, to) =>
      supabaseAdmin
        .from("replacement_requests")
        .select("id, plaque_id, reason, status, created_at, tracking_number, tracking_url")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
  ]);

  const plaqueIds = plaques.map((plaque) => plaque.id);
  const plaqueNames = new Map(plaques.map((plaque) => [plaque.id, plaque.name]));
  const tapCounts = new Map(
    await Promise.all(
      plaques.map(async (plaque) => {
        const { count, error } = await supabaseAdmin
          .from("tap_events")
          .select("id", { count: "exact", head: true })
          .eq("plaque_id", plaque.id);
        if (error) throw error;
        return [plaque.id, count ?? 0] as const;
      })
    )
  );
  const totalTaps = [...tapCounts.values()].reduce((sum, count) => sum + count, 0);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let recentTapCount = 0;
  let recentTaps: TapEvent[] = [];

  if (plaqueIds.length > 0) {
    const [{ count, error: countError }, { data, error: recentError }] =
      await Promise.all([
        supabaseAdmin
          .from("tap_events")
          .select("id", { count: "exact", head: true })
          .in("plaque_id", plaqueIds)
          .gte("created_at", sevenDaysAgo),
        supabaseAdmin
          .from("tap_events")
          .select("plaque_id, created_at")
          .in("plaque_id", plaqueIds)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    if (countError) throw countError;
    if (recentError) throw recentError;
    recentTapCount = count ?? 0;
    recentTaps = data ?? [];
  }

  const status = subscription?.status;
  const statusClass =
    status === "active" || status === "trialing"
      ? "bg-emerald-50 text-emerald-700"
      : status === "past_due"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-200 text-slate-700";
  const isModernTapMonthly = Boolean(
    subscription?.stripe_price_id &&
      subscription.stripe_price_id === process.env.STRIPE_PRICE_ID
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
        >
          ← Back to Admin Dashboard
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              ModernTap Customer
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {business.name}
            </h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}>
            {status ? status.replaceAll("_", " ") : "No subscription"}
          </span>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Admin Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <a href="#plaques" className="rounded-xl bg-slate-900 px-4 py-2 text-white">Manage Plaques</a>
            <a href="#billing" className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700">View Billing / Subscription</a>
            <a href="#edit-business" className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700">Edit Business</a>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Customer Health</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewCard title="Subscription Status" value={status ? status.replaceAll("_", " ") : "No subscription"} />
            <OverviewCard title="Total Plaques" value={plaques.length.toLocaleString("en-US")} />
            <OverviewCard title="Total Taps" value={totalTaps.toLocaleString("en-US")} />
            <OverviewCard title="Taps in the Last 7 Days" value={recentTapCount.toLocaleString("en-US")} />
          </div>
        </section>

        <section id="billing" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Billing / Subscription</h2>
          <p className="mt-1 text-sm text-slate-500">Read-only Stripe and subscription information. Manage billing through the customer’s own Stripe account.</p>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-slate-500">Status</dt><dd className="mt-1 font-semibold capitalize text-slate-900">{status ? status.replaceAll("_", " ") : "No subscription"}</dd></div>
            <div><dt className="text-slate-500">Plan</dt><dd className="mt-1 font-semibold text-slate-900">{isModernTapMonthly ? "ModernTap Monthly · $29.99/month" : "—"}</dd></div>
            <div><dt className="text-slate-500">Stripe Customer ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-900">{subscription?.stripe_customer_id ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Stripe Subscription ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-900">{subscription?.stripe_subscription_id ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Current Period Ends</dt><dd className="mt-1 text-slate-900">{subscription?.current_period_end ? formatDate(subscription.current_period_end) : "—"}</dd></div>
            <div><dt className="text-slate-500">Cancellation Date</dt><dd className="mt-1 text-slate-900">{subscription?.cancel_at ? formatDate(subscription.cancel_at) : "—"}</dd></div>
            <div><dt className="text-slate-500">Cancel at Period End</dt><dd className="mt-1 text-slate-900">{subscription ? (subscription.cancel_at_period_end ? "Yes" : "No") : "—"}</dd></div>
            <div><dt className="text-slate-500">Record Created</dt><dd className="mt-1 text-slate-900">{subscription?.created_at ? formatDate(subscription.created_at) : "—"}</dd></div>
          </dl>
        </section>

        <section id="edit-business" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Edit Business</h2>
          <EditBusinessForm businessId={business.id} name={business.name} />
        </section>

        <section id="plaques" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Plaques</h2>
          <p className="mt-1 text-sm text-slate-500">Every smart plaque connected to this business.</p>
          {!plaques.length ? (
            <p className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No plaques yet.</p>
          ) : (
            <div className="mt-6 divide-y divide-slate-100">
              {plaques.map((plaque) => (
                <div key={plaque.id} className="grid gap-4 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{plaque.name}</p>
                    <p className="mt-1 break-all text-sm text-slate-500">{plaque.destination_url || "No destination set"}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">/t/{plaque.code}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm md:justify-end">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${plaque.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {plaque.active ? "Active" : "Inactive"}
                    </span>
                    <span className="font-semibold text-slate-900">{tapCounts.get(plaque.id) ?? 0} taps</span>
                    <span className="text-slate-500">Created {formatDate(plaque.created_at)}</span>
                    <Link href={`/admin/businesses/${business.id}/plaques/${plaque.id}`} className="font-semibold text-slate-700 underline underline-offset-2">Manage Plaque</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total Taps</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totalTaps.toLocaleString("en-US")}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Taps in the Last 7 Days</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{recentTapCount.toLocaleString("en-US")}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-semibold text-slate-900">Plaque Performance</h3>
              {!plaques.length ? (
                <p className="mt-3 text-sm text-slate-500">No plaque activity yet.</p>
              ) : (
                <div className="mt-3 divide-y divide-slate-100">
                  {[...plaques].sort((a, b) => (tapCounts.get(b.id) ?? 0) - (tapCounts.get(a.id) ?? 0)).map((plaque) => (
                    <div key={plaque.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                      <span className="truncate text-slate-700">{plaque.name}</span>
                      <span className="font-semibold text-slate-900">{tapCounts.get(plaque.id) ?? 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Recent Taps</h3>
              {!recentTaps.length ? (
                <p className="mt-3 text-sm text-slate-500">No taps recorded yet.</p>
              ) : (
                <div className="mt-3 divide-y divide-slate-100">
                  {recentTaps.map((tap, index) => (
                    <div key={`${tap.plaque_id}-${tap.created_at}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span className="font-medium text-slate-700">{plaqueNames.get(tap.plaque_id) ?? "Unknown plaque"}</span>
                      <span className="text-slate-500">{formatDateTime(tap.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Support History</h2>
          {!supportTickets.length ? (
            <p className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No support tickets yet.</p>
          ) : (
            <div className="mt-6 divide-y divide-slate-100">
              {supportTickets.map((ticket) => (
                <div key={ticket.id} className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-slate-900">{ticket.subject}</p>
                    <p className="mt-1 text-sm text-slate-500">{ticket.category} · {formatDate(ticket.created_at)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{ticket.status.replaceAll("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Replacement History</h2>
          {!replacementRequests.length ? (
            <p className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No replacement requests yet.</p>
          ) : (
            <div className="mt-6 divide-y divide-slate-100">
              {replacementRequests.map((request) => (
                <div key={request.id} className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{request.plaque_id ? plaqueNames.get(request.plaque_id) ?? "Unknown plaque" : "No plaque selected"}</p>
                    <p className="mt-1 text-sm text-slate-500">{request.reason} · Submitted {formatDate(request.created_at)}</p>
                    {request.tracking_number ? <p className="mt-2 text-sm text-slate-600">Tracking: {request.tracking_number}</p> : null}
                    {request.tracking_url ? <p className="mt-1 break-all text-xs text-slate-500">{request.tracking_url}</p> : null}
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{request.status.replaceAll("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-sm">
          <h2 className="font-semibold text-slate-900">Admin Information</h2>
          <dl className="mt-4 grid gap-4 text-slate-500 sm:grid-cols-3">
            <div><dt>Business ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-700">{business.id}</dd></div>
            <div><dt>Stripe Customer ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-700">{subscription?.stripe_customer_id ?? "—"}</dd></div>
            <div><dt>Stripe Price ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-700">{subscription?.stripe_price_id ?? "—"}</dd></div>
          </dl>
        </section>
      </div>
    </main>
  );
}
