export const placements = ["table", "checkbook", "register", "other"] as const;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid request.");
  return value as Record<string, unknown>;
}

function name(value: unknown, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new Error(`Enter a name with 1–${max} characters.`);
  }
  return value.trim();
}

export function pilotInput(value: unknown) {
  const input = record(value);
  if (Object.keys(input).some(key => !["name", "startDate", "days", "reviews", "rating", "notes"].includes(key))) {
    throw new Error("Unexpected pilot field.");
  }
  const businessName = name(input.name, 100);
  if (typeof input.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
    throw new Error("Enter a valid trial start date.");
  }
  const start = new Date(`${input.startDate}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== input.startDate) {
    throw new Error("Enter a valid trial start date.");
  }
  if (typeof input.days !== "number" || !Number.isInteger(input.days) || input.days < 1 || input.days > 365) {
    throw new Error("Trial length must be 1–365 days.");
  }
  const reviews = input.reviews ?? null;
  const rating = input.rating ?? null;
  if (reviews !== null && (typeof reviews !== "number" || !Number.isInteger(reviews) || reviews < 0 || reviews > 2147483647)) {
    throw new Error("Review count must be a non-negative whole number.");
  }
  if (rating !== null && (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5)) {
    throw new Error("Star rating must be between 1 and 5.");
  }
  if (input.notes !== undefined && (typeof input.notes !== "string" || input.notes.length > 5000)) {
    throw new Error("Notes must be at most 5,000 characters.");
  }
  return {
    name: businessName, owner_id: null, is_pilot: true,
    trial_started_at: start.toISOString(),
    trial_ends_at: new Date(start.getTime() + input.days * 86400000).toISOString(),
    pilot_reviews_start: reviews, pilot_rating_start: rating,
    pilot_notes: typeof input.notes === "string" ? input.notes.trim() || null : null,
  };
}

export function pilotPlaqueInput(value: unknown) {
  const input = record(value);
  if (Object.keys(input).some(key => !["name", "placement", "destination", "quantity"].includes(key))) {
    throw new Error("Unexpected plaque field.");
  }
  const plaqueName = name(input.name, 100);
  if (!placements.some(placement => placement === input.placement)) throw new Error("Choose a placement.");
  if (typeof input.quantity !== "number" || !Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 30) {
    throw new Error("Quantity must be 1–30.");
  }
  if (typeof input.destination !== "string" || input.destination.length > 2048) throw new Error("Enter an http or https destination.");
  let url: URL;
  try {
    url = new URL(input.destination);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
  } catch { throw new Error("Enter an http or https destination without credentials."); }
  return { name: plaqueName, placement: input.placement as typeof placements[number], destination: url.toString(), quantity: input.quantity };
}
