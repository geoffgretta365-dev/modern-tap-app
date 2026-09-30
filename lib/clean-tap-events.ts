import type { SupabaseClient } from "@supabase/supabase-js";

// Every reporting query starts here. Raw tap_events access is reserved for recording.
// Filtering in SQL keeps counts, pagination, recent activity and aggregations consistent.
export function cleanTapEvents(
  client: SupabaseClient,
  options?: { count?: "exact" | "planned" | "estimated"; head?: boolean },
) {
  return client.from("tap_events").select("id, plaque_id, created_at", options)
    .eq("is_bot", false).eq("is_repeat", false);
}
