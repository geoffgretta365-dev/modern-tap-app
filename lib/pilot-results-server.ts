import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanTapEvents } from "@/lib/clean-tap-events";
import { pilotWindow, summarizePilot, type PilotBusiness, type ResultPlaque, type ResultTap } from "@/lib/pilot-results";

const businessColumns = "id, name, is_pilot, trial_started_at, trial_ends_at, pilot_reviews_start, pilot_reviews_end, pilot_rating_start, pilot_rating_end";
export const validShareToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);

// Only callers that have checked the admin allowlist may use this lookup by ID.
export async function adminPilotResults(businessId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("businesses").select(businessColumns)
    .eq("id", businessId).eq("is_pilot", true).maybeSingle();
  if (error) throw new Error("Could not load pilot results.");
  return data ? loadResults(data, admin) : null;
}

async function findSharedPilot(token: string) {
  if (!validShareToken(token)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("businesses").select(businessColumns)
    .eq("pilot_share_token", token).eq("is_pilot", true).maybeSingle();
  if (error) throw new Error("Could not load pilot results.");
  return data ? { business: data, admin } : null;
}

// Check before Next streams its shared loading boundary, preserving a real HTTP 404.
export async function publicPilotAvailable(token: string) {
  const match = await findSharedPilot(token);
  return Boolean(match && pilotWindow(match.business));
}

export async function sharedPilotResults(token: string) {
  const match = await findSharedPilot(token);
  if (!match) return null;
  const results = await loadResults(match.business, match.admin);
  if (!results) return null;
  // Public rendering receives only the requested metrics and review counts.
  return { ...results, plaques: results.plaques.slice(0, 5), ratingStart: null, ratingEnd: null };
}

async function loadResults(business: PilotBusiness, admin: ReturnType<typeof createAdminClient>) {
  const now = new Date(), window = pilotWindow(business, now);
  if (!window) return null;
  const plaques: ResultPlaque[] = [], taps: ResultTap[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from("plaques").select("id, name, placement")
      .eq("business_id", business.id).order("id").range(offset, offset + 999);
    if (error) throw new Error("Could not load pilot plaques.");
    plaques.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  // Limit URL size and paginate without silently truncating at PostgREST's row cap.
  if (window.until > window.start) for (let i = 0; i < plaques.length; i += 100) {
    const ids = plaques.slice(i, i + 100).map(p => p.id);
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await cleanTapEvents(admin)
        .in("plaque_id", ids).gte("created_at", window.start.toISOString()).lt("created_at", window.until.toISOString())
        .order("created_at").order("id").range(offset, offset + 999);
      if (error) throw new Error("Could not load pilot taps.");
      taps.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
  }
  return summarizePilot(business, plaques, taps, now);
}
