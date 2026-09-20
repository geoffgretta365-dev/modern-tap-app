export const instant = false;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ReplacementActions from "./replacement-actions";
import SupportActions from "./support-actions";
import BusinessesTable from "./businesses-table";
import DesignRequestActions from "./design-request-actions";
import { formatEasternDateTime } from "@/lib/format-eastern-time";

type BusinessRow = {
  id: string;
  name: string;
  created_at: string;
};

type SubscriptionRow = {
  business_id: string;
  status: string;
  stripe_price_id: string | null;
  stripe_customer_id: string | null;
};

export default async function AdminPage() {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();
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

  const businesses: BusinessRow[] = [];
  const subscriptions: SubscriptionRow[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("businesses")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    businesses.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("business_id, status, stripe_price_id, stripe_customer_id")
      .order("business_id")
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    subscriptions.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  const { count: totalPlaques, error: plaqueCountError } = await supabaseAdmin
    .from("plaques")
    .select("id", { count: "exact", head: true });

  if (plaqueCountError) throw plaqueCountError;

  const subscriptionsByBusinessId = new Map(
    subscriptions.map((subscription) => [subscription.business_id, subscription])
  );
  const activeSubscriptions = businesses.filter((business) => {
    const status = subscriptionsByBusinessId.get(business.id)?.status;
    return status === "active" || status === "trialing";
  }).length;
  const inactiveSubscriptions = businesses.length - activeSubscriptions;

const { data: replacementRequests } = await supabaseAdmin
  .from("replacement_requests")
  .select(`
    id,
    reason,
    details,
    status,
    shipping_name,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_zip,
    tracking_number,
    tracking_url,
    created_at,
    businesses(name),
    plaques(name)
  `)
  .order("created_at", { ascending: false });
  const { data: supportTickets } = await supabaseAdmin
  .from("support_tickets")
  .select(`
    id,
    category,
    subject,
    message,
    status,
    created_at,
    resolved_at,
    businesses(name),
    plaques(name)
  `)
  .order("created_at", { ascending: false });
  const { data: designRequests, error: designRequestsError } = await supabaseAdmin
    .from("design_change_requests")
    .select("id, notes, inspiration_url, status, created_at, businesses(name), plaques(name)")
    .order("created_at", { ascending: false });
  if (designRequestsError) throw designRequestsError;

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          ModernTap Internal
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Admin Dashboard
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Track businesses, subscriptions, support, and replacement requests.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewCard title="Total Businesses" value={businesses.length} />
          <OverviewCard title="Active Subscriptions" value={activeSubscriptions} />
          <OverviewCard title="Inactive / Past Due" value={inactiveSubscriptions} />
          <OverviewCard title="Total Plaques" value={totalPlaques ?? 0} />
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Businesses &amp; Subscriptions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Track every ModernTap customer and their subscription from one place.
            </p>
          </div>

          <BusinessesTable
            businesses={businesses.map((business) => {
              const subscription = subscriptionsByBusinessId.get(business.id);
              return {
                ...business,
                status: subscription?.status ?? null,
                stripe_price_id: subscription?.stripe_price_id ?? null,
                stripe_customer_id: subscription?.stripe_customer_id ?? null,
              };
            })}
            modernTapPriceId={process.env.STRIPE_PRICE_ID ?? null}
          />
        </section>

<section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">
        Replacement Requests
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Review customer replacement requests and shipping information.
      </p>
    </div>

    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {replacementRequests?.length ?? 0} total
    </span>
  </div>

  {!replacementRequests?.length ? (
    <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
      No replacement requests yet.
    </div>
  ) : (
    <div className="mt-6 space-y-4">
      {replacementRequests.map((request) => {
        const business = Array.isArray(request.businesses)
          ? request.businesses[0]
          : request.businesses;

        const plaque = Array.isArray(request.plaques)
          ? request.plaques[0]
          : request.plaques;

        return (
          <div
            key={request.id}
            className="rounded-xl border border-slate-200 p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {business?.name ?? "Unknown business"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {plaque?.name ?? "Unknown plaque"} · {request.reason}
                </p>
              </div>

              <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold capitalize text-amber-700">
                {request.status.replaceAll("_", " ")}
              </span>
            </div>

            {request.details ? (
              <p className="mt-4 text-sm text-slate-600">
                {request.details}
              </p>
            ) : null}

            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">
                Ship to
              </p>

              <p className="mt-1">{request.shipping_name}</p>
              <p>{request.shipping_address_line1}</p>

              {request.shipping_address_line2 ? (
                <p>{request.shipping_address_line2}</p>
              ) : null}

              <p>
                {request.shipping_city}, {request.shipping_state}{" "}
                {request.shipping_zip}
              </p>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Submitted{" "}
              {formatEasternDateTime(request.created_at)}
            </p>
            <ReplacementActions
  requestId={request.id}
  currentStatus={request.status}
  currentTrackingNumber={request.tracking_number}
  currentTrackingUrl={request.tracking_url}
/>
          </div>
        );
      })}
    </div>
  )}
</section>
<section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">
        Support Tickets
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Review support requests submitted by ModernTap customers.
      </p>
    </div>

    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {supportTickets?.length ?? 0} total
    </span>
  </div>

  {!supportTickets?.length ? (
    <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
      No support tickets yet.
    </div>
  ) : (
    <div className="mt-6 space-y-4">
      {supportTickets.map((ticket) => {
        const business = Array.isArray(ticket.businesses)
          ? ticket.businesses[0]
          : ticket.businesses;

        const plaque = Array.isArray(ticket.plaques)
          ? ticket.plaques[0]
          : ticket.plaques;

        return (
          <div
            key={ticket.id}
            className="rounded-xl border border-slate-200 p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {ticket.subject}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {business?.name ?? "Unknown business"} ·{" "}
                  {ticket.category}
                </p>

                {plaque?.name ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Plaque: {plaque.name}
                  </p>
                ) : null}
              </div>

              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                {ticket.status.replaceAll("_", " ")}
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              {ticket.message}
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Submitted{" "}
              {formatEasternDateTime(ticket.created_at)}
            </p>
            <SupportActions
  ticketId={ticket.id}
  currentStatus={ticket.status}
/>
          </div>
        );
      })}
    </div>
  )}
</section>
<section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <h2 className="text-lg font-semibold text-slate-900">Design Requests</h2>
  <p className="mt-1 text-sm text-slate-500">Manage customer requests for new plaque designs.</p>
  {!designRequests?.length ? <p className="mt-6 text-sm text-slate-500">No design requests yet.</p> :
    <div className="mt-6 space-y-4">{designRequests.map((item) => {
      const business = Array.isArray(item.businesses) ? item.businesses[0] : item.businesses;
      const plaque = Array.isArray(item.plaques) ? item.plaques[0] : item.plaques;
      return <article key={item.id} className="rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="font-semibold text-slate-900">{business?.name ?? "Unknown business"}</p>
            <p className="mt-1 text-sm text-slate-600">Plaque: {plaque?.name ?? "Unknown plaque"}</p></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{item.status}</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">{item.notes}</p>
        {item.inspiration_url && <a href={item.inspiration_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block break-all text-sm text-teal-700 underline">Reference ↗</a>}
        <p className="mt-3 text-xs text-slate-500">Submitted {formatEasternDateTime(item.created_at)}</p>
        <DesignRequestActions requestId={item.id} status={item.status} />
      </article>;
    })}</div>}
</section>
      </div>
    </main>
  );
}

function OverviewCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value.toLocaleString("en-US")}
      </p>
    </div>
  );
}
