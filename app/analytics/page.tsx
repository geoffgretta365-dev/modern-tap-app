export const instant = false;

import Link from "next/link";
import AppShell from "@/app/components/app-shell";
import { requireSubscription } from "@/lib/require-subscription";

type Plaque = { id: string; name: string; destination_url: string | null; active: boolean };
type Tap = { plaque_id: string; created_at: string };
type SmartPageClick = { id: string; plaque_id: string; button_label_snapshot: string; created_at: string };
type Period = 7 | 30 | 90;
const DAY = 86_400_000;
const PAGE_SIZE = 1000;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateLabel(day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" })
    .format(new Date(`${day}T00:00:00Z`));
}

function Card({ title, value, detail }: { title: string; value: number; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <p className="mt-3 text-3xl font-bold text-slate-950">{value.toLocaleString("en-US")}</p>
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
      .select("id, name, destination_url, active")
      .eq("business_id", business.id).order("id").range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    plaques.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const ids = plaques.map((plaque) => plaque.id);
  const names = new Map(plaques.map((plaque) => [plaque.id, plaque.name]));
  const allTimeByPlaque = new Map(plaques.map((plaque) => [plaque.id, 0]));
  const periodByPlaque = new Map(plaques.map((plaque) => [plaque.id, 0]));
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const currentStart = new Date(today.getTime() - (period - 1) * DAY);
  const previousStart = new Date(currentStart.getTime() - period * DAY);
  const days = Array.from({ length: period }, (_, index) => ({
    date: dayKey(new Date(currentStart.getTime() + index * DAY)), taps: 0,
  }));
  const dayIndex = new Map(days.map((day, index) => [day.date, index]));
  const hours = Array.from({ length: 24 }, () => 0);
  let allTime = 0;
  let current = 0;
  let previous = 0;
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
          const index = dayIndex.get(dayKey(time));
          if (index !== undefined) days[index].taps++;
          hours[time.getUTCHours()]++;
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
      countSince(new Date(today.getTime() - 6 * DAY)),
      countSince(new Date(today.getTime() - 29 * DAY)),
    ]);
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
    ? "No taps in previous period"
    : `${current >= previous ? "+" : ""}${Math.round((current - previous) / previous * 100)}% vs previous ${period} days`;
  const best = current ? days.reduce((a, b) => b.taps > a.taps ? b : a) : null;
  const busiestHour = current ? hours.indexOf(Math.max(...hours)) : null;
  const hourLabel = (hour: number) => new Intl.DateTimeFormat("en-US", {
    hour: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, hour)));
  const ranked = [...plaques].sort((a, b) =>
    (periodByPlaque.get(b.id) ?? 0) - (periodByPlaque.get(a.id) ?? 0) ||
    a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const maxDay = Math.max(1, ...days.map((day) => day.taps));
  const clickComparison = previousClicks === 0
    ? "No button clicks in previous period"
    : `${currentClicks >= previousClicks ? "+" : ""}${Math.round((currentClicks - previousClicks) / previousClicks * 100)}% vs previous ${period} days`;
  const topButtons = [...clicksByLabel].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const topClickPlaques = [...clicksByPlaque].sort((a, b) => b[1] - a[1] ||
    (names.get(a[0]) ?? "").localeCompare(names.get(b[0]) ?? "") || a[0].localeCompare(b[0]));

  return <AppShell businessName={business.name}>
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Performance</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Analytics</h1>
      <p className="mt-2 text-slate-500">Understand how customers interact with your ModernTap plaques.</p>
      <p className="mt-1 text-xs text-slate-500">Dates and hours use UTC because no business timezone is stored.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Today" value={todayTaps} detail="Since midnight UTC" />
        <Card title="Last 7 Days" value={weekTaps} detail="Including today" />
        <Card title="Last 30 Days" value={monthTaps} detail="Including today" />
        <Card title="All-Time Taps" value={allTime} detail="Across all your plaques" />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div><p className="font-semibold text-slate-900">Selected period</p>
          <p className="mt-1 text-sm text-slate-500">{current.toLocaleString("en-US")} taps · {comparison}</p></div>
        <nav aria-label="Analytics period" className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {([7, 30, 90] as const).map((value) =>
            <Link key={value} href={`/analytics?period=${value}`}
              aria-current={period === value ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${period === value ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              {value} Days
            </Link>)}
        </nav>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Taps Over Time</h2>
        <p className="mt-1 text-sm text-slate-500">Daily plaque interactions over {period} days.</p>
        {current === 0
          ? <p className="mt-8 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No taps in this period. Activity will appear after a plaque is tapped.</p>
          : <div className="mt-8 overflow-x-auto pb-2">
              <div className="flex h-56 items-end gap-1.5" style={{ minWidth: `${period * 31}px` }}>
                {days.map((day) =>
                  <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"
                    title={`${dateLabel(day.date, { month: "short", day: "numeric" })}: ${day.taps} taps`}>
                    <span className="mb-1 text-[10px] font-semibold text-slate-600">{day.taps}</span>
                    <div className="flex h-40 items-end">
                      <div className={`w-full rounded-t-md ${day.taps ? "bg-slate-950" : "bg-slate-200"}`}
                        style={{ height: day.taps ? `${Math.max(day.taps / maxDay * 100, 6)}%` : "2px" }} />
                    </div>
                    <span className="mt-2 whitespace-nowrap text-[10px] text-slate-500">{dateLabel(day.date, { month: "numeric", day: "numeric" })}</span>
                  </div>)}
              </div>
            </div>}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Top Performing Plaques</h2>
          <p className="mt-1 text-sm text-slate-500">Ranked by taps in the selected period.</p>
          {ranked.length === 0
            ? <p className="mt-6 text-sm text-slate-500">Add a plaque to see its performance.</p>
            : <div className="mt-5 divide-y divide-slate-100">{ranked.map((plaque) => {
                const taps = periodByPlaque.get(plaque.id) ?? 0;
                return <div key={plaque.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0"><p className="font-semibold text-slate-900">{plaque.name}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{plaque.destination_url || "No destination set"}</p></div>
                  <div className="shrink-0 text-right"><p className="font-bold text-slate-950">{taps.toLocaleString("en-US")} taps</p>
                    <p className="text-xs text-slate-500">{current ? (taps / current * 100).toFixed(1) : "0.0"}% of period</p></div>
                </div>;
              })}</div>}
        </section>
        <div className="grid gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Best Day</h2>
            <p className="mt-3 text-xl font-bold text-slate-950">{best ? dateLabel(best.date, { weekday: "long", month: "long", day: "numeric" }) : "No taps yet"}</p>
            <p className="mt-1 text-sm text-slate-500">{best ? `${best.taps} taps` : "No activity in this period"}</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Busiest Time</h2>
            <p className="mt-3 text-xl font-bold text-slate-950">{busiestHour === null ? "No taps yet" : `${hourLabel(busiestHour)} – ${hourLabel((busiestHour + 1) % 24)} UTC`}</p>
            <p className="mt-1 text-sm text-slate-500">{busiestHour === null ? "No activity in this period" : `${hours[busiestHour]} taps in this hour of day`}</p>
          </section>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Plaque Performance</h2>
        <p className="mt-1 text-sm text-slate-500">Every plaque, including those with no taps this period.</p>
        {plaques.length === 0
          ? <p className="mt-6 text-sm text-slate-500">No plaques yet. Add one to start tracking interactions.</p>
          : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr><th className="py-3 pr-4">Plaque</th><th className="px-4 py-3">Period Taps</th><th className="px-4 py-3">All-Time Taps</th><th className="px-4 py-3">Destination</th><th className="pl-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">{plaques.map((plaque) =>
                <tr key={plaque.id}>
                  <td className="py-3 pr-4 font-semibold text-slate-900">{plaque.name}</td>
                  <td className="px-4 py-3 text-slate-700">{(periodByPlaque.get(plaque.id) ?? 0).toLocaleString("en-US")}</td>
                  <td className="px-4 py-3 text-slate-700">{(allTimeByPlaque.get(plaque.id) ?? 0).toLocaleString("en-US")}</td>
                  <td className="max-w-xs break-all px-4 py-3 text-slate-500">{plaque.destination_url || "—"}</td>
                  <td className="pl-4 py-3 text-slate-700">{plaque.active ? "Active" : "Inactive"}</td>
                </tr>)}</tbody>
            </table></div>}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Smart Page Engagement</h2>
        <p className="mt-1 text-sm text-slate-500">Button clicks in the selected {period}-day period. Clicks are separate from plaque taps.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Card title="Smart Page Button Clicks" value={currentClicks} detail={`Selected ${period} days, including today`} />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500">Previous Period</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{previousClicks.toLocaleString("en-US")}</p>
            <p className="mt-2 text-xs text-slate-500">{clickComparison}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold text-slate-950">Top Clicked Buttons</h3>
            <p className="mt-1 text-xs text-slate-500">Grouped by the label recorded when each button was clicked.</p>
            {topButtons.length === 0
              ? <p className="mt-4 text-sm text-slate-500">No button clicks in this period.</p>
              : <div className="mt-3 divide-y divide-slate-100">{topButtons.map(([label, count]) =>
                  <div key={label} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <span className="break-words font-medium text-slate-800">{label}</span>
                    <span className="shrink-0 font-semibold text-slate-950">{count.toLocaleString("en-US")} clicks</span>
                  </div>)}</div>}
          </div>
          <div>
            <h3 className="font-semibold text-slate-950">Clicks by Plaque</h3>
            <p className="mt-1 text-xs text-slate-500">Smart Page button clicks for each plaque.</p>
            {topClickPlaques.length === 0
              ? <p className="mt-4 text-sm text-slate-500">No Smart Page plaque clicks in this period.</p>
              : <div className="mt-3 divide-y divide-slate-100">{topClickPlaques.map(([plaqueId, count]) =>
                  <div key={plaqueId} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <span className="font-medium text-slate-800">{names.get(plaqueId) ?? "Plaque"}</span>
                    <span className="shrink-0 font-semibold text-slate-950">{count.toLocaleString("en-US")} clicks</span>
                  </div>)}</div>}
          </div>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="font-semibold text-slate-950">Recent Button Clicks</h3>
          {recentClicks.length === 0
            ? <p className="mt-4 text-sm text-slate-500">No button click activity yet.</p>
            : <div className="mt-3 divide-y divide-slate-100">{recentClicks.map((click) =>
                <div key={click.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="font-medium text-slate-900">{click.button_label_snapshot} <span className="font-normal text-slate-500">· {names.get(click.plaque_id) ?? "Plaque"}</span></span>
                  <time className="text-slate-500" dateTime={click.created_at}>
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(click.created_at))} UTC
                  </time>
                </div>)}</div>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Recent Tap Activity</h2>
        <p className="mt-1 text-sm text-slate-500">Your latest recorded plaque interactions.</p>
        {recent.length === 0
          ? <p className="mt-6 text-sm text-slate-500">No tap activity yet. Recent interactions will appear here.</p>
          : <div className="mt-5 divide-y divide-slate-100">{recent.map((tap, index) =>
              <div key={`${tap.plaque_id}-${tap.created_at}-${index}`} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="font-semibold text-slate-900">{names.get(tap.plaque_id) ?? "Plaque"}</span>
                <time className="shrink-0 text-right text-slate-500" dateTime={tap.created_at}>
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(tap.created_at))} UTC
                </time>
              </div>)}</div>}
      </section>
    </div>
  </AppShell>;
}
