import type { PilotResults } from "@/lib/pilot-results";
import { formatEasternDateTime, formatEasternDayKey } from "@/lib/format-eastern-time";

const number = (value: number) => value.toLocaleString("en-US");
const label = (date: string) => formatEasternDayKey(date, { month: "short", day: "numeric" });

export function PilotResultsView({ results, publicView = false }: { results: PilotResults; publicView?: boolean }) {
  const max = Math.max(1, ...results.days.map(day => day.taps));
  const reviewChange = results.reviewsStart !== null && results.reviewsEnd !== null ? results.reviewsEnd - results.reviewsStart : null;
  const hasRatingChange = results.ratingStart !== null && results.ratingEnd !== null;
  return <div className="space-y-6">
    <header className="pt-2">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-teal-800">
        <span className="rounded-full bg-teal-50 px-3 py-1.5">Day {results.day} of {results.length}</span>
        <span>{results.status}</span>
      </div>
      <h1 className="mt-4 break-words text-3xl font-bold tracking-tight text-[#17324d] sm:text-4xl">{results.name}</h1>
      <p className="mt-2 text-sm text-slate-600">Your pilot results · {label(results.firstDay)} – {label(results.days[results.days.length - 1].date)}</p>
    </header>

    <section aria-label="Tap totals" className="grid grid-cols-2 overflow-hidden rounded-2xl bg-[#17324d] text-white">
      <div className="min-w-0 p-5 sm:p-7">
        <p className="text-sm text-slate-200">Total taps</p>
        <p className="mt-2 break-words text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">{number(results.total)}</p>
        <p className="mt-2 text-xs text-slate-300">During your pilot</p>
      </div>
      <div className="min-w-0 border-l border-white/15 p-5 sm:p-7">
        <p className="text-sm text-slate-200">{publicView ? "Taps this week" : "Last 7 days"}</p>
        <p className="mt-2 break-words text-4xl font-bold tabular-nums tracking-tight text-[#6ce3d5] sm:text-5xl">{number(results.week)}</p>
        <p className="mt-2 text-xs text-slate-300">Past 7 days</p>
      </div>
    </section>
    <p className="text-sm leading-6 text-slate-600">Taps are phone taps on your plaques, not confirmed reviews.</p>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="font-semibold text-[#17324d]">Where taps happen</h2>
      <ul className="mt-4 space-y-4">{results.byPlacement.map(item => <li key={item.placement}>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="capitalize text-slate-700">{item.placement}</span>
          <span className="font-semibold tabular-nums text-slate-900">{number(item.taps)} <span className="ml-2 font-normal text-slate-500">{item.share}%</span></span>
        </div>
        <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${item.share}%` }} /></div>
      </li>)}</ul>
      <p className="mt-4 text-xs leading-5 text-slate-500">Share of pilot taps. Unassigned placements appear under Other.</p>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-semibold text-[#17324d]">Taps by day</h2><span className="text-xs text-slate-500">Eastern time</span></div>
      {results.total === 0 && <p className="mt-3 text-sm text-slate-500">No phone taps recorded in this pilot yet.</p>}
      <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Daily taps chart; scroll for longer pilots">
        <ol className="flex h-36 items-end gap-1 border-b border-slate-200" style={{ minWidth: results.days.length * 8 }}>
          {results.days.map(day => <li key={day.date} title={`${label(day.date)}: ${number(day.taps)} taps`} aria-label={`${label(day.date)}: ${number(day.taps)} taps`} className="flex h-full min-w-1 flex-1 items-end">
            <div className={`w-full rounded-t-sm ${day.taps ? "bg-teal-600" : "bg-slate-200"}`} style={{ height: day.taps ? `${day.taps / max * 100}%` : "2px" }} />
          </li>)}
        </ol>
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500"><span>{label(results.days[0].date)}</span><span>{label(results.days[results.days.length - 1].date)}</span></div>
      <details className="mt-4 text-sm text-slate-600"><summary className="cursor-pointer py-2 font-medium">Daily counts</summary><ul className="mt-2 max-h-64 overflow-auto">{results.days.map(day => <li key={day.date} className="flex justify-between border-t border-slate-100 py-2"><span>{label(day.date)}</span><span>{number(day.taps)}</span></li>)}</ul></details>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="font-semibold text-[#17324d]">{publicView ? "Top 5 plaques" : "Plaque ranking"}</h2>
      {!results.plaques.length ? <p className="mt-4 text-sm text-slate-500">Plaques will appear here once set up.</p> : <ol className="mt-3 divide-y divide-slate-100">{results.plaques.map((plaque, i) => <li key={i} className="flex items-baseline gap-3 py-3 text-sm">
        <span className="w-4 shrink-0 text-xs tabular-nums text-slate-400">{i + 1}</span><span className="min-w-0 flex-1 break-words text-slate-700">{plaque.name}</span><span className="shrink-0 font-semibold tabular-nums text-slate-900">{number(plaque.taps)}</span>
      </li>)}</ol>}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="font-semibold text-[#17324d]">Google review progress</h2>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div><dt className="text-sm text-slate-500">Day 1 reviews</dt><dd className="mt-2 text-2xl font-bold tabular-nums text-[#17324d]">{results.reviewsStart === null ? "—" : number(results.reviewsStart)}</dd></div>
        <div><dt className="text-sm text-slate-500">Day {results.length} reviews</dt><dd className="mt-2 text-2xl font-bold tabular-nums text-[#17324d]">{results.reviewsEnd === null ? "Pending" : number(results.reviewsEnd)}</dd></div>
      </dl>
      {!publicView && <p className="mt-4 text-sm text-slate-600">Star rating: {results.ratingStart ?? "Not recorded"} → {results.ratingEnd ?? "Pending"}</p>}
      {reviewChange !== null && <p className="mt-4 font-semibold text-teal-800">{reviewChange >= 0 ? "+" : ""}{number(reviewChange)} reviews{!publicView && hasRatingChange ? `, ${results.ratingStart} → ${results.ratingEnd}` : ""}</p>}
      <p className="mt-3 text-xs leading-5 text-slate-500">Review counts are recorded manually from Google. They are separate from plaque taps.</p>
    </section>
    <p className="text-xs leading-5 text-slate-500">Updated {formatEasternDateTime(results.updatedAt)}. Reload this page for the latest results.</p>
  </div>;
}
