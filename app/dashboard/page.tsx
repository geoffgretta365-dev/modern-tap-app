export const instant = false;

import Link from "next/link";
import AppShell from "@/app/components/app-shell";
import { requireSubscription } from "@/lib/require-subscription";
import { easternDayKey, easternMidnightUtc, formatEasternDateTime, shiftDay } from "@/lib/format-eastern-time";

export default async function DashboardPage() {
  const { supabase, business } = await requireSubscription();

  const { data: plaques } = await supabase
    .from("plaques")
    .select("id, name, code, destination_url, active, purpose")
    .eq("business_id", business.id);

  const plaqueIds = plaques?.map((plaque) => plaque.id) ?? [];

  let tapEvents: {
    plaque_id: string;
    created_at: string;
  }[] = [];

  if (plaqueIds.length > 0) {
    const { data } = await supabase
      .from("tap_events")
      .select("plaque_id, created_at")
      .in("plaque_id", plaqueIds);

    tapEvents = data ?? [];
  }

  const now = new Date();

  const startOfToday = easternMidnightUtc(easternDayKey(now));

  const sevenDaysAgo = easternMidnightUtc(shiftDay(easternDayKey(now), -6));

  const previousSevenDaysAgo = easternMidnightUtc(shiftDay(easternDayKey(now), -13));

  const totalTaps = tapEvents.length;

  const todayTaps = tapEvents.filter(
    (tap) => new Date(tap.created_at) >= startOfToday
  ).length;

  const weekTaps = tapEvents.filter(
    (tap) => new Date(tap.created_at) >= sevenDaysAgo && new Date(tap.created_at) <= now
  ).length;

  // The previous period ends exclusively where the current period begins.
  const previousWeekTaps = tapEvents.filter(
    (tap) => new Date(tap.created_at) >= previousSevenDaysAgo && new Date(tap.created_at) < sevenDaysAgo
  ).length;
  const weeklyChange = previousWeekTaps > 0
    ? Math.round(((weekTaps - previousWeekTaps) / previousWeekTaps) * 100)
    : null;

  const tapsByPlaque = new Map<string, number>();
  for (const tap of tapEvents) {
    tapsByPlaque.set(tap.plaque_id, (tapsByPlaque.get(tap.plaque_id) ?? 0) + 1);
  }
  const plaquePerformance = (plaques ?? [])
    .map((plaque) => ({ ...plaque, totalTaps: tapsByPlaque.get(plaque.id) ?? 0 }))
    .sort((a, b) => b.totalTaps - a.totalTaps);
  const topPlaque = plaquePerformance[0];

  const activePlaques =
    plaques?.filter((plaque) => plaque.active).length ?? 0;

  const reviewIds = (plaques ?? []).filter((plaque) => plaque.purpose === "review").map((plaque) => plaque.id);
  const reviewMonthStart = easternMidnightUtc(shiftDay(easternDayKey(now), -29));
  let reviewPageVisits = 0;
  if (reviewIds.length) {
    const { count, error } = await supabase.from("tap_events")
      .select("id", { count: "exact", head: true }).in("plaque_id", reviewIds)
      .gte("created_at", reviewMonthStart.toISOString()).lte("created_at", now.toISOString());
    if (error) throw error;
    reviewPageVisits = count ?? 0;
  }
  const activeReviewCards = plaques?.filter((plaque) => plaque.purpose === "review" && plaque.active).length ?? 0;
  const names = new Map((plaques ?? []).map((plaque) => [plaque.id, plaque.name]));
  const reviewSet = new Set(reviewIds);
  const { data: recentTaps, error: recentTapsError } = plaqueIds.length
    ? await supabase.from("tap_events")
        .select("plaque_id, created_at").in("plaque_id", plaqueIds)
        .order("created_at", { ascending: false }).limit(8)
    : { data: [], error: null };
  if (recentTapsError) throw recentTapsError;
  const { data: recentClicks, error: recentClicksError } = plaqueIds.length
    ? await supabase.from("smart_page_clicks")
        .select("plaque_id, button_label_snapshot, created_at")
        .in("plaque_id", plaqueIds)
        .order("created_at", { ascending: false }).limit(8)
    : { data: [], error: null };
  if (recentClicksError) throw recentClicksError;
  const recentActivity = [
    ...(recentTaps ?? [])
      .map((tap) => ({ key: `tap-${tap.plaque_id}-${tap.created_at}`, date: tap.created_at,
        text: `${names.get(tap.plaque_id) ?? "Plaque"} ${reviewSet.has(tap.plaque_id) ? "Review Card opened" : "plaque tapped"}` })),
    ...(recentClicks ?? []).map((click) => ({ key: `click-${click.plaque_id}-${click.created_at}`,
      date: click.created_at, text: `${click.button_label_snapshot} button clicked on ${names.get(click.plaque_id) ?? "Smart Page"}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);


  return (
    <AppShell businessName={business.name}>
      <div className="mx-auto max-w-[1280px]">

        <div className="flex flex-col gap-6 border-b border-[#dbe4ea] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mt-kicker">
              Overview
            </p>

            <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-[#17324d] sm:text-4xl">
              {business.name} at a glance
            </h1>

            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              See how customers are engaging with your ModernTap plaques and what&apos;s driving activity.
            </p>
          </div>

          <Link
            href="/plaques"
            className="mt-secondary-action w-fit"
          >
            Manage Plaques
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            title="Last 7 Days"
            value={weekTaps}
            detail={weeklyChange === null
              ? "Your current 7-day activity"
              : `${weeklyChange > 0 ? "+" : ""}${weeklyChange}% vs previous 7 days`}
          />

          <StatCard
            title="Today"
            value={todayTaps}
            detail="Customer interactions today"
          />

          <StatCard
            title="All-Time Engagement"
            value={totalTaps}
            detail="Total plaque visits"
          />

          <StatCard
            title="Active Plaques"
            value={activePlaques}
            detail={`${plaques?.length ?? 0} total in your account`}
          />
        </div>

        <section className="mt-panel mt-6 p-5 sm:p-6" aria-labelledby="performance-snapshot-heading">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 break-words">
              <h2 id="performance-snapshot-heading" className="mt-kicker">Performance Snapshot</h2>
              <p className="mt-3 text-lg font-semibold text-[#17324d]">
                {weekTaps > 0
                  ? `Your plaques generated ${weekTaps.toLocaleString("en-US")} customer ${weekTaps === 1 ? "interaction" : "interactions"} in the last 7 days.`
                  : "Your plaques are ready to start collecting customer engagement."}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {topPlaque && topPlaque.totalTaps > 0
                  ? `${topPlaque.name} is currently your most-used plaque with ${topPlaque.totalTaps.toLocaleString("en-US")} all-time ${topPlaque.totalTaps === 1 ? "tap" : "taps"}.`
                  : "As customers begin tapping, ModernTap will show you which placements perform best."}
              </p>
            </div>
            <Link href="/analytics" className="mt-secondary-action w-fit shrink-0">Explore Analytics →</Link>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="text-lg font-bold text-[#17324d]">Quick Actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Manage Plaques", href: "/plaques" },
              { label: "View Analytics", href: "/analytics" },
              { label: "Request Design Change", href: "/design-requests" },
              { label: "Plan & Billing", href: "/billing" },
            ].map((action) => <Link key={action.href} href={action.href}
              className="mt-card mt-hover-card flex min-w-0 items-center justify-between gap-2 p-4 text-sm font-semibold text-[#17324d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]">
              {action.label}<span className="text-[#0f8f8a]" aria-hidden="true">↗</span>
            </Link>)}
          </div>
        </section>

        <div className="mt-9 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">

          <section className="mt-card min-w-0 p-5 sm:p-6">

            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#17324d]">
                  Plaque Performance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  See which plaque placements are getting the most customer engagement.
                </p>
              </div>

              <Link
                href="/plaques"
                className="shrink-0 text-sm font-semibold text-[#0f8f8a] hover:text-[#0b716d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]"
              >
                View all →
              </Link>
            </div>

            <div className="mt-6 divide-y divide-slate-100">

              {plaquePerformance.map((plaque) => (
                <div
                  key={plaque.id}
                  className="flex min-w-0 items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">

                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">
                        {plaque.name}
                      </p>

                      <span
                        className={`h-2 w-2 rounded-full ${
                          plaque.active
                            ? "bg-[#16c7c0]"
                            : "bg-slate-300"
                        }`}
                      />
                    </div>

                    <p className="mt-1 truncate text-sm text-slate-400">
                      /t/{plaque.code}
                    </p>

                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-bold tracking-tight text-[#17324d]">
                      {plaque.totalTaps.toLocaleString("en-US")}
                    </p>

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      taps
                    </p>
                  </div>
                </div>
              ))}

              {(!plaques || plaques.length === 0) && (
                <div className="py-10 text-center text-sm text-slate-500">
                  No plaques yet.
                </div>
              )}

            </div>
          </section>

          <section className="mt-card min-w-0 p-5 sm:p-6">

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0f8f8a]">
              MODERNTAP TOOLS
            </p>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#17324d]">
              Everything in one place.
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Control your plaques, review performance, update customer destinations, and request design support whenever you need it.
            </p>

            <div className="mt-6 space-y-4">
              {[
                { title: "Plaque Control", description: "Manage active plaques and where customers are sent." },
                { title: "Performance Analytics", description: "Understand engagement across your locations and placements." },
                { title: "Design Support", description: "Request eligible plaque design updates from your account." },
              ].map((feature) => (
                <div key={feature.title} className="rounded-xl bg-[#f3f7f9] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[#17324d]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>

            <Link href="/plaques" className="mt-primary-action mt-6">
              Manage My Plaques
            </Link>

          </section>

        </div>

        <section className="mt-panel mt-8 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mt-kicker">Review Tracking</p>
              <h2 className="mt-2 text-xl font-bold text-[#17324d]">Review Page Visits</h2>
              <p className="mt-1 text-sm text-slate-600">See how often customers open your review experience from ModernTap Review Cards.</p>
            </div>
            <Link href="/analytics#review-tracking" className="mt-secondary-action">View Analytics →</Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[#f3f7f9] p-4"><p className="text-sm text-slate-600">Last 30 days</p><p className="mt-2 text-3xl font-bold text-[#17324d]">{reviewPageVisits.toLocaleString("en-US")}</p></div>
            <div className="rounded-xl bg-[#f3f7f9] p-4"><p className="text-sm text-slate-600">Active Review Cards</p><p className="mt-2 text-3xl font-bold text-[#17324d]">{activeReviewCards}</p></div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Review Page Visits do not guarantee that a review was submitted.</p>
        </section>
        <section className="mt-panel mt-8 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#17324d]">Recent Activity</h2>
          <p className="mt-1 text-sm text-slate-500">A live feed of recent plaque visits and Smart Page actions. Times are Eastern.</p>
          {recentActivity.length ? <ul className="mt-5 divide-y divide-[#dbe4ea]">
            {recentActivity.map((item, index) => <li key={`${item.key}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0 break-words text-sm font-medium text-[#17324d]">{item.text}</span>
              <time dateTime={item.date} className="text-xs text-slate-500">{formatEasternDateTime(item.date)}</time>
            </li>)}
          </ul> : <p className="mt-5 rounded-xl bg-[#f3f7f9] p-5 text-sm text-slate-600">No activity yet. Plaque visits and button clicks will appear here.</p>}
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="mt-card mt-hover-card min-w-0 p-5 sm:p-6">

      <span className="mb-4 block h-1 w-8 rounded-full bg-[#16c7c0]" aria-hidden="true" />

      <p className="text-xs font-semibold text-slate-600 sm:text-sm">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold tracking-tight text-[#17324d] sm:text-4xl">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {detail}
      </p>

    </div>
  );
}
