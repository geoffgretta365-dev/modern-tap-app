export const instant = false;

import Link from "next/link";
import AppShell from "@/app/components/app-shell";
import { requireSubscription } from "@/lib/require-subscription";
import { easternDayKey, easternHour, easternMidnightUtc, formatEasternDateTime, formatEasternDayKey, shiftDay } from "@/lib/format-eastern-time";

type Plaque = { id: string; name: string; destination_url: string | null; active: boolean; purpose: string };
type Tap = { plaque_id: string; created_at: string };
type SmartPageClick = { id: string; plaque_id: string; button_label_snapshot: string; created_at: string };
type Period = 7 | 30 | 90;
const PAGE_SIZE = 1000;

function dateLabel(day: string, options: Intl.DateTimeFormatOptions) {
  return formatEasternDayKey(day, options);
}

function Card({ title, value, detail }: { title: string; value: number; detail: string }) {
  return <div className="mt-stat-card min-w-0 p-5 sm:p-6">
    <span className="mb-4 block h-1 w-8 rounded-full bg-[#16c7c0]" aria-hidden="true" />
    <p className="text-sm font-medium text-slate-600">{title}</p>
    <p className="mt-3 text-3xl font-bold text-[#17324d]">{value.toLocaleString("en-US")}</p>
    <p className="mt-2 text-xs text-slate-500">{detail}</p>
  </div>;
}

export default async function AnalyticsPage({ searchParams }: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { supabase, business } = await requireSubscription();
  const requestedPeriod = (await searchParams).period;
  const period: Period = requestedPeriod === "7" ? 7 : requestedPeriod === "90" ? 90 : 30;
  const plaques: Plaque[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.from("plaques")
      .select("id, name, destination_url, active, purpose")
      .eq("business_id", business.id).order("id").range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    plaques.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const ids = plaques.map((plaque) => plaque.id);
  const reviewPlaques = plaques.filter((plaque) => plaque.purpose === "review");
  const reviewIds = reviewPlaques.map((plaque) => plaque.id);
  const names = new Map(plaques.map((plaque) => [plaque.id, plaque.name]));
  const allTimeByPlaque = new Map(plaques.map((plaque) => [plaque.id, 0]));
  const periodByPlaque = new Map(plaques.map((plaque) => [plaque.id, 0]));
  const now = new Date();
  const todayKey = easternDayKey(now);
  const today = easternMidnightUtc(todayKey);
  const currentStart = easternMidnightUtc(shiftDay(todayKey, -(period - 1)));
  const previousStart = easternMidnightUtc(shiftDay(todayKey, -(period * 2 - 1)));
  const days = Array.from({ length: period }, (_, index) => ({
    date: shiftDay(todayKey, index - (period - 1)), taps: 0,
  }));
  const dayIndex = new Map(days.map((day, index) => [day.date, index]));
  const hours = Array.from({ length: 24 }, () => 0);
  let allTime = 0;
  let current = 0;
  let previous = 0;
  let reviewToday = 0;
  let reviewWeek = 0;
  let reviewMonth = 0;
  let todayTaps = 0;
  let weekTaps = 0;
  let monthTaps = 0;
  let recent: Tap[] = [];
  let recentClicks: SmartPageClick[] = [];
  let currentClicks = 0;
  let previousClicks = 0;
  const clicksByLabel = new Map<string, number>();
  const clicksByPlaque = new Map<string, number>();

  if (ids.length) {
    // Aggregate all-time counts page by page; retain only the plaque IDs.
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.from("tap_events")
        .select("plaque_id").in("plaque_id", ids)
        .order("id").range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      for (const tap of data ?? []) {
        allTime++;
        allTimeByPlaque.set(tap.plaque_id, (allTimeByPlaque.get(tap.plaque_id) ?? 0) + 1);
      }
      if (!data || data.length < PAGE_SIZE) break;
    }

    // Only the chosen period and its immediately preceding period need timestamps.
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.from("tap_events")
        .select("plaque_id, created_at").in("plaque_id", ids)
        .gte("created_at", previousStart.toISOString())
        .lte("created_at", now.toISOString())
        .order("created_at").order("id").range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      for (const tap of data ?? []) {
        const time = new Date(tap.created_at);
        if (time >= currentStart) {
          current++;
          periodByPlaque.set(tap.plaque_id, (periodByPlaque.get(tap.plaque_id) ?? 0) + 1);
          const index = dayIndex.get(easternDayKey(time));
          if (index !== undefined) days[index].taps++;
          hours[easternHour(time)]++;
        } else previous++;
      }
      if (!data || data.length < PAGE_SIZE) break;
    }

    const countSince = async (start: Date) => {
      const { count, error } = await supabase.from("tap_events")
        .select("id", { count: "exact", head: true }).in("plaque_id", ids)
        .gte("created_at", start.toISOString()).lte("created_at", now.toISOString());
      if (error) throw error;
      return count ?? 0;
    };
    [todayTaps, weekTaps, monthTaps] = await Promise.all([
      countSince(today),
      countSince(easternMidnightUtc(shiftDay(todayKey, -6))),
      countSince(easternMidnightUtc(shiftDay(todayKey, -29))),
    ]);
    if (reviewIds.length) {
      const countReviewSince = async (start: Date) => {
        const { count, error } = await supabase.from("tap_events")
          .select("id", { count: "exact", head: true }).in("plaque_id", reviewIds)
          .gte("created_at", start.toISOString()).lte("created_at", now.toISOString());
        if (error) throw error;
        return count ?? 0;
      };
      [reviewToday, reviewWeek, reviewMonth] = await Promise.all([
        countReviewSince(today),
        countReviewSince(easternMidnightUtc(shiftDay(todayKey, -6))),
        countReviewSince(easternMidnightUtc(shiftDay(todayKey, -29))),
      ]);
    }
    const { data, error } = await supabase.from("tap_events")
      .select("plaque_id, created_at").in("plaque_id", ids)
      .order("created_at", { ascending: false }).limit(8);
    if (error) throw error;
    recent = data ?? [];

    // Clicks stay separate from plaque taps, including in the comparison window.
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data: clicks, error: clicksError } = await supabase.from("smart_page_clicks")
        .select("id, plaque_id, button_label_snapshot, created_at")
        .in("plaque_id", ids)
        .gte("created_at", previousStart.toISOString())
        .lte("created_at", now.toISOString())
        .order("created_at").order("id")
        .range(offset, offset + PAGE_SIZE - 1);
      if (clicksError) throw clicksError;
      for (const click of clicks ?? []) {
        if (new Date(click.created_at) < currentStart) {
          previousClicks++;
        } else {
          currentClicks++;
          clicksByLabel.set(click.button_label_snapshot, (clicksByLabel.get(click.button_label_snapshot) ?? 0) + 1);
          clicksByPlaque.set(click.plaque_id, (clicksByPlaque.get(click.plaque_id) ?? 0) + 1);
        }
      }
      if (!clicks || clicks.length < PAGE_SIZE) break;
    }

    const { data: latestClicks, error: latestClicksError } = await supabase.from("smart_page_clicks")
      .select("id, plaque_id, button_label_snapshot, created_at")
      .in("plaque_id", ids)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .limit(8);
    if (latestClicksError) throw latestClicksError;
    recentClicks = latestClicks ?? [];
  }

  const comparison = previous === 0
    ? "No interactions in previous period"
    : `${current >= previous ? "+" : ""}${Math.round((current - previous) / previous * 100)}% vs previous ${period} days`;
  const best = current ? days.reduce((a, b) => b.taps > a.taps ? b : a) : null;
  const busiestHour = current ? hours.indexOf(Math.max(...hours)) : null;
  const hourLabel = (hour: number) => new Intl.DateTimeFormat("en-US", {
    hour: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, hour)));
  const ranked = [...plaques].sort((a, b) =>
    (periodByPlaque.get(b.id) ?? 0) - (periodByPlaque.get(a.id) ?? 0) ||
    a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const engagementChange = previous > 0 ? Math.abs((current - previous) / previous * 100) : null;
  const changeLabel = engagementChange !== null && engagementChange > 0 && engagementChange < 1
    ? "less than 1%"
    : `${Math.round(engagementChange ?? 0)}%`;
  const performanceInsight = current === 0
    ? "No plaque interactions were recorded during this period."
    : previous === 0
      ? `Your plaques recorded ${current.toLocaleString("en-US")} ${current === 1 ? "interaction" : "interactions"} during this period.`
      : current === previous
        ? `Customer engagement was unchanged compared with the previous ${period}-day period.`
        : `Customer engagement ${current > previous ? "increased" : "decreased"} ${changeLabel} compared with the previous ${period}-day period.`;
  const topPlaque = ranked[0];
  const topPlaqueInteractions = topPlaque ? periodByPlaque.get(topPlaque.id) ?? 0 : 0;
  // Aggregate clicks are not linked to individual visits and can exceed visit counts.
  const smartPageActionRate = current > 0 ? currentClicks / current * 100 : null;
  const maxDay = Math.max(1, ...days.map((day) => day.taps));
  const reviewAllTime = reviewIds.reduce((sum, id) => sum + (allTimeByPlaque.get(id) ?? 0), 0);
  const topReviewPlaques = reviewPlaques.slice().sort((a, b) =>
    (periodByPlaque.get(b.id) ?? 0) - (periodByPlaque.get(a.id) ?? 0));
  const clickComparison = previousClicks === 0
    ? "No button clicks in previous period"
    : `${currentClicks >= previousClicks ? "+" : ""}${Math.round((currentClicks - previousClicks) / previousClicks * 100)}% vs previous ${period} days`;
  const topButtons = [...clicksByLabel].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const topClickPlaques = [...clicksByPlaque].sort((a, b) => b[1] - a[1] ||
    (names.get(a[0]) ?? "").localeCompare(names.get(b[0]) ?? "") || a[0].localeCompare(b[0]));

  return <AppShell businessName={business.name}>
    <div className="mx-auto max-w-[1280px]">
      <p className="mt-kicker">Performance</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17324d] sm:text-4xl">Analytics</h1>
      <p className="mt-2 text-slate-500">See when customers engage, which plaques perform best, and how they interact with your ModernTap experience.</p>
      <p className="mt-1 text-xs text-slate-500">Dates and times are shown in Eastern Time.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card title="Today" value={todayTaps} detail="Since midnight ET" />
        <Card title="Last 7 Days" value={weekTaps} detail="Including today" />
        <Card title="Last 30 Days" value={monthTaps} detail="Including today" />
        <Card title="All-Time Engagement" value={allTime} detail="Total recorded plaque visits" />
      </div>

      <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
        <div><p className="font-semibold text-slate-900">Selected period</p>
          <p className="mt-2 text-2xl font-bold text-[#17324d]">{current.toLocaleString("en-US")} {current === 1 ? "interaction" : "interactions"}</p>
          <p className="mt-muted mt-1 text-sm">{comparison}</p></div>
        <nav aria-label="Analytics period" className="mt-segmented flex max-w-full flex-wrap p-1">
          {([7, 30, 90] as const).map((value) =>
            <Link key={value} href={`/analytics?period=${value}`}
              aria-current={period === value ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0] ${period === value ? "mt-segmented-active" : "mt-segmented-inactive"}`}>
              {value} Days
            </Link>)}
        </nav>
      </div>

      <section className="mt-6 rounded-2xl border border-[#dbe4ea] bg-[#f3f7f9] p-5 sm:p-6" aria-labelledby="performance-insight-heading">
        <h2 id="performance-insight-heading" className="mt-kicker">Performance Insight</h2>
        <p className="mt-3 font-semibold leading-6 text-[#17324d]">{performanceInsight}</p>
        {topPlaque && topPlaqueInteractions > 0 && (
          <p className="mt-2 break-words text-sm leading-6 text-slate-600">
            {topPlaque.name} is your most-used plaque with {topPlaqueInteractions.toLocaleString("en-US")} {topPlaqueInteractions === 1 ? "tap" : "taps"} during this period.
          </p>
        )}
      </section>

      <section className="mt-6 mt-panel min-w-0 p-5 sm:p-6">
        <h2 className="mt-section-heading text-lg">Engagement Over Time</h2>
        <p className="mt-muted mt-1 text-sm">Daily plaque interactions during the selected {period}-day period.</p>
        {current === 0
          ? <p className="mt-8 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No interactions in this period. Activity will appear after a plaque is tapped.</p>
          : <div className="mt-8 overflow-x-auto pb-2">
              <div className="flex h-56 items-end gap-1.5" style={{ minWidth: `${period * 31}px` }}>
                {days.map((day) =>
                  <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"
                    title={`${dateLabel(day.date, { month: "short", day: "numeric" })}: ${day.taps} taps`}>
                    <span className="mb-1 text-[10px] font-semibold text-slate-600">{day.taps}</span>
                    <div className="flex h-40 items-end">
                      <div className={`w-full rounded-t-md transition-colors ${day.taps ? "bg-[#16c7c0] hover:bg-[#0f8f8a]" : "bg-slate-200"}`}
                        style={{ height: day.taps ? `${Math.max(day.taps / maxDay * 100, 6)}%` : "2px" }} />
                    </div>
                    <span className="mt-2 whitespace-nowrap text-[10px] text-slate-500">{dateLabel(day.date, { month: "numeric", day: "numeric" })}</span>
                  </div>)}
              </div>
            </div>}
      </section>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
        <section className="mt-panel min-w-0 p-5 sm:p-6">
          <h2 className="mt-section-heading text-lg">Top Performing Plaques</h2>
          <p className="mt-muted mt-1 text-sm">See which plaque placements generated the most engagement during this period.</p>
          {ranked.length === 0
            ? <p className="mt-6 text-sm text-slate-500">Add a plaque to see its performance.</p>
            : <div className="mt-5 divide-y divide-[#dbe4ea]">{ranked.map((plaque) => {
                const taps = periodByPlaque.get(plaque.id) ?? 0;
                return <div key={plaque.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0"><p className="break-words font-semibold text-slate-900">{plaque.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{current ? (taps / current * 100).toFixed(1) : "0.0"}% of period engagement</p></div>
                  <div className="shrink-0 text-right"><p className="font-bold text-[#17324d]">{taps.toLocaleString("en-US")}</p>
                    <p className="text-xs text-slate-500">{taps === 1 ? "interaction" : "interactions"}</p></div>
                </div>;
              })}</div>}
        </section>
        <div className="grid gap-6">
          <section className="mt-panel min-w-0 p-5 sm:p-6">
            <h2 className="mt-section-heading text-lg">Busiest Day</h2>
            <p className="mt-muted mt-1 text-xs">The day with the most plaque interactions in this period.</p>
            <p className="mt-3 text-xl font-bold text-[#17324d]">{best ? dateLabel(best.date, { weekday: "long", month: "long", day: "numeric" }) : "No activity yet"}</p>
            <p className="mt-muted mt-1 text-sm">{best ? `${best.taps.toLocaleString("en-US")} ${best.taps === 1 ? "interaction" : "interactions"}` : "No activity in this period"}</p>
          </section>
          <section className="mt-panel min-w-0 p-5 sm:p-6">
            <h2 className="mt-section-heading text-lg">Busiest Time</h2>
            <p className="mt-muted mt-1 text-xs">The hour of day with the most plaque interactions in this period.</p>
            <p className="mt-3 text-xl font-bold text-[#17324d]">{busiestHour === null ? "No activity yet" : `${hourLabel(busiestHour)} – ${hourLabel((busiestHour + 1) % 24)} ET`}</p>
            <p className="mt-muted mt-1 text-sm">{busiestHour === null ? "No activity in this period" : `${hours[busiestHour].toLocaleString("en-US")} ${hours[busiestHour] === 1 ? "interaction" : "interactions"} in this hour of day`}</p>
          </section>
        </div>
      </div>

      <section className="mt-6 mt-panel min-w-0 p-5 sm:p-6">
        <h2 className="mt-section-heading text-lg">Plaque Performance</h2>
        <p className="mt-muted mt-1 text-sm">Compare engagement across every plaque in your account.</p>
        {plaques.length === 0
          ? <p className="mt-6 text-sm text-slate-500">No plaques yet. Add one to start tracking interactions.</p>
          : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr><th className="py-3 pr-4">Plaque</th><th className="px-4 py-3">Period Interactions</th><th className="px-4 py-3">All-Time Interactions</th><th className="px-4 py-3">Destination</th><th className="pl-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">{ranked.map((plaque) =>
                <tr key={plaque.id}>
                  <td className="py-3 pr-4 font-semibold text-slate-900">{plaque.name}</td>
                  <td className="px-4 py-3 text-slate-700">{(periodByPlaque.get(plaque.id) ?? 0).toLocaleString("en-US")}</td>
                  <td className="px-4 py-3 text-slate-700">{(allTimeByPlaque.get(plaque.id) ?? 0).toLocaleString("en-US")}</td>
                  <td className="max-w-xs break-all px-4 py-3 text-slate-500">{plaque.destination_url || "—"}</td>
                  <td className="pl-4 py-3 text-slate-700"><span className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${plaque.active ? "bg-[#16c7c0]" : "bg-slate-300"}`} aria-hidden="true" />{plaque.active ? "Active" : "Inactive"}</span></td>
                </tr>)}</tbody>
            </table></div>}
      </section>

      <section className="mt-6 mt-panel min-w-0 p-5 sm:p-6">
        <div className="mt-engagement-heading p-4 sm:p-5">
          <h2 className="mt-section-heading text-lg">Smart Page Engagement</h2>
          <p className="mt-1 text-sm text-slate-600">See what customers do after opening a ModernTap Smart Page.</p>
          <p className="mt-2 text-xs text-slate-500">Button clicks are tracked separately from plaque interactions.</p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Card title="Button Clicks" value={currentClicks} detail="Actions taken on Smart Pages during the selected period" />
          <div className="mt-stat-card min-w-0 p-5 sm:p-6">
            <p className="text-sm font-medium text-slate-500">Previous Period Clicks</p>
            <p className="mt-3 text-3xl font-bold text-[#17324d]">{previousClicks.toLocaleString("en-US")}</p>
            <p className="mt-2 text-xs text-slate-500">{clickComparison}</p>
          </div>
          <div className="mt-stat-card min-w-0 p-5 sm:p-6">
            <p className="text-sm font-medium text-slate-600">Smart Page Action Rate</p>
            <p className="mt-3 text-3xl font-bold text-[#17324d]">{smartPageActionRate === null ? "—" : `${smartPageActionRate.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`}</p>
            <p className="mt-2 text-xs text-slate-500">Tracked Smart Page button clicks as a percentage of plaque interactions during this period.</p>
            <p className="mt-2 text-xs text-slate-500">Repeat clicks can exceed 100%. This does not measure the share of visits that led to a click.</p>
          </div>
        </div>
        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold text-[#17324d]">Top Clicked Buttons</h3>
            <p className="mt-1 text-xs text-slate-500">Grouped by the label recorded when each button was clicked.</p>
            {topButtons.length === 0
              ? <p className="mt-4 text-sm text-slate-500">No button clicks in this period.</p>
              : <div className="mt-3 divide-y divide-[#dbe4ea]">{topButtons.map(([label, count]) =>
                  <div key={label} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <span className="break-words font-medium text-slate-800">{label}</span>
                    <span className="shrink-0 font-semibold text-[#17324d]">{count.toLocaleString("en-US")} clicks</span>
                  </div>)}</div>}
          </div>
          <div className="rounded-2xl border border-[#dbe4ea] bg-white p-4 sm:p-5">
            <h3 className="font-semibold text-[#17324d]">Clicks by Plaque</h3>
            <p className="mt-1 text-xs text-slate-500">Smart Page button clicks for each plaque.</p>
            {topClickPlaques.length === 0
              ? <p className="mt-4 text-sm text-slate-500">No Smart Page plaque clicks in this period.</p>
              : <div className="mt-3 divide-y divide-[#dbe4ea]">{topClickPlaques.map(([plaqueId, count]) =>
                  <div key={plaqueId} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <span className="font-medium text-slate-800">{names.get(plaqueId) ?? "Plaque"}</span>
                    <span className="shrink-0 font-semibold text-[#17324d]">{count.toLocaleString("en-US")} clicks</span>
                  </div>)}</div>}
          </div>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="font-semibold text-[#17324d]">Recent Button Clicks</h3>
          {recentClicks.length === 0
            ? <p className="mt-4 text-sm text-slate-500">No button click activity yet.</p>
            : <div className="mt-3 divide-y divide-[#dbe4ea]">{recentClicks.map((click) =>
                <div key={click.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="font-medium text-slate-900">{click.button_label_snapshot} <span className="font-normal text-slate-500">· {names.get(click.plaque_id) ?? "Plaque"}</span></span>
                  <time className="text-slate-500" dateTime={click.created_at}>
                    {formatEasternDateTime(click.created_at)}
                  </time>
                </div>)}</div>}
        </div>
      </section>

      <section id="review-tracking" className="mt-6 mt-panel min-w-0 p-5 sm:p-6">
        <div className="mt-engagement-heading p-4 sm:p-5">
          <p className="mt-kicker">Review Tracking</p>
          <h2 className="mt-2 text-xl font-bold text-[#17324d]">Review Engagement</h2>
          <p className="mt-1 text-sm text-slate-700">Track how often customers open review destinations from your ModernTap Review Cards.</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Card title="Review Card Taps Today" value={reviewToday} detail="Since midnight ET" />
          <Card title="Review Card Taps Last 7 Days" value={reviewWeek} detail="Including today" />
          <Card title="Review Card Taps Last 30 Days" value={reviewMonth} detail="Including today" />
          <Card title="All-Time Review Card Taps" value={reviewAllTime} detail="Across Review Cards" />
        </div>
        <p className="mt-5 rounded-xl bg-[#dffaf8] p-4 text-sm text-[#17324d]">Review destination visits measure customer interest. They do not confirm that a review was submitted.</p>
        <div className="mt-6">
          <div className="rounded-xl border border-[#dbe4ea] p-4">
            <h3 className="font-semibold text-[#17324d]">Top Review Cards</h3>
            {topReviewPlaques.length === 0 ? <div className="mt-3 text-sm text-slate-500">Mark a plaque as a Review Card to see its visits here. <Link href="/plaques" className="font-semibold text-[#0f8f8a] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16c7c0]">My Plaques</Link></div> :
              <div className="mt-3 divide-y divide-[#dbe4ea]">{topReviewPlaques.map((plaque) =>
                <div key={plaque.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-slate-800">{plaque.name}</span>
                  <span className="shrink-0 font-semibold text-[#17324d]">{(periodByPlaque.get(plaque.id) ?? 0).toLocaleString("en-US")} visits</span>
                </div>)}</div>}
          </div>
        </div>
      </section>

      <section className="mt-6 mt-panel min-w-0 p-5 sm:p-6">
        <h2 className="mt-section-heading text-lg">Recent Plaque Activity</h2>
        <p className="mt-muted mt-1 text-sm">Your latest recorded customer interactions.</p>
        {recent.length === 0
          ? <p className="mt-6 text-sm text-slate-500">No plaque activity yet. Recent interactions will appear here.</p>
          : <div className="mt-5 divide-y divide-[#dbe4ea]">{recent.map((tap, index) =>
              <div key={`${tap.plaque_id}-${tap.created_at}-${index}`} className="flex flex-wrap items-center justify-between gap-4 py-3 text-sm">
                <span className="min-w-0 break-words font-semibold text-slate-900">{names.get(tap.plaque_id) ?? "Plaque"}</span>
                <time className="shrink-0 text-right text-slate-500" dateTime={tap.created_at}>
                  {formatEasternDateTime(tap.created_at)}
                </time>
              </div>)}</div>}
      </section>

      <aside className="mt-6 border-t border-[#dbe4ea] px-1 pt-5 text-xs leading-5 text-slate-500" aria-labelledby="data-clarity-heading">
        <h2 id="data-clarity-heading" className="font-semibold text-slate-600">Understanding your ModernTap data</h2>
        <p className="mt-2">Plaque interactions show when a customer opens a ModernTap destination. Smart Page button clicks show tracked actions taken after opening a Smart Page. Review destination visits show when a Review Card is opened, but do not confirm that a review was submitted.</p>
      </aside>
    </div>
  </AppShell>;
}
