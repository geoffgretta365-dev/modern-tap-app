const EASTERN = "America/New_York";

const dayParts = new Intl.DateTimeFormat("en-US", {
  timeZone: EASTERN, year: "numeric", month: "2-digit", day: "2-digit",
});
const dateTimeParts = new Intl.DateTimeFormat("en-US", {
  timeZone: EASTERN, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function easternDayKey(date: Date): string {
  const parts = Object.fromEntries(dayParts.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function shiftDay(key: string, amount: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

export function easternMidnightUtc(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = Object.fromEntries(dateTimeParts.formatToParts(instant).map(({ type, value }) => [type, value]));
    const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second));
    const difference = target - shown;
    if (difference === 0) break;
    instant += difference;
  }
  return new Date(instant);
}

export function easternHour(date: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN, hour: "numeric", hourCycle: "h23",
  }).format(date));
}

export function formatEasternDate(value: string | Date, options: Intl.DateTimeFormatOptions = {
  year: "numeric", month: "short", day: "numeric",
}): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: EASTERN }).format(new Date(value));
}

export function formatEasternDateTime(value: string | Date): string {
  return `${formatEasternDate(value, { dateStyle: "medium", timeStyle: "short" })} ET`;
}

export function formatEasternDayKey(key: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" })
    .format(new Date(`${key}T12:00:00Z`));
}
