import { easternDayKey, easternMidnightUtc, shiftDay } from "@/lib/format-eastern-time";
import { placements } from "@/lib/pilot-input";

export type PilotBusiness = {
  id: string; name: string; is_pilot: boolean;
  trial_started_at: string | null; trial_ends_at: string | null;
  pilot_reviews_start: number | null; pilot_reviews_end: number | null;
  pilot_rating_start: number | null; pilot_rating_end: number | null;
};
export type ResultPlaque = { id: string; name: string; placement: string | null };
export type ResultTap = { plaque_id: string; created_at: string };
const calendarDays = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

export function pilotWindow(business: PilotBusiness, now = new Date()) {
  if (!business.is_pilot || !business.trial_started_at || !business.trial_ends_at) return null;
  const start = new Date(business.trial_started_at), end = new Date(business.trial_ends_at);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return null;
  const firstDay = easternDayKey(start), endDay = easternDayKey(end);
  const length = calendarDays(firstDay, endDay);
  if (length < 1 || length > 365) return null;
  const day = Math.max(0, Math.min(length, calendarDays(firstDay, easternDayKey(now)) + 1));
  return {
    start, end, until: new Date(Math.min(now.getTime(), end.getTime())), firstDay, length, day,
    weekStart: easternMidnightUtc(shiftDay(easternDayKey(now), -6)),
    status: now < start ? "Upcoming" : now >= end ? "Completed" : "In progress",
  };
}

export function summarizePilot(business: PilotBusiness, plaques: ResultPlaque[], taps: ResultTap[], now = new Date()) {
  const window = pilotWindow(business, now);
  if (!window) return null;
  const days = Array.from({ length: window.length }, (_, i) => ({ date: shiftDay(window.firstDay, i), taps: 0 }));
  const byDay = new Map(days.map(day => [day.date, day]));
  const byPlaque = new Map(plaques.map(plaque => [plaque.id, { ...plaque, taps: 0 }]));
  let total = 0, week = 0;
  for (const tap of taps) {
    const time = new Date(tap.created_at), plaque = byPlaque.get(tap.plaque_id);
    if (!plaque || time < window.start || time >= window.until || !Number.isFinite(time.getTime())) continue;
    total++; plaque.taps++;
    if (time >= window.weekStart) week++;
    const day = byDay.get(easternDayKey(time));
    if (day) day.taps++;
  }
  const byPlacement = placements.map(placement => {
    const count = [...byPlaque.values()].filter(p => (p.placement ?? "other") === placement).reduce((sum, p) => sum + p.taps, 0);
    return { placement, taps: count, share: total ? Math.round(count / total * 100) : 0 };
  });
  // Public-safe DTO: deliberately omit business/plaque IDs, tokens and private fields.
  return {
    name: business.name, day: window.day, length: window.length, status: window.status,
    firstDay: window.firstDay, endDay: easternDayKey(window.end), updatedAt: now.toISOString(),
    total, week, days, byPlacement,
    plaques: [...byPlaque.values()].sort((a, b) => b.taps - a.taps || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
      .map(({ name, taps }) => ({ name, taps })),
    reviewsStart: business.pilot_reviews_start, reviewsEnd: business.pilot_reviews_end,
    ratingStart: business.pilot_rating_start, ratingEnd: business.pilot_rating_end,
  };
}
export type PilotResults = NonNullable<ReturnType<typeof summarizePilot>>;
