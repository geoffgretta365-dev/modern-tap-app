import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const EMAIL = "demo@moderntap.test";
const NAME = "Alex Morgan";
const BUSINESS = "Cedar & Stone Café";
const PASSWORD = process.env.MODERNTAP_DEMO_PASSWORD;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY || !PASSWORD || PASSWORD.length < 12) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and MODERNTAP_DEMO_PASSWORD (at least 12 characters).");
}

const admin = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const demoId = (kind, name) => {
  const bytes = createHash("sha256").update(`moderntap-demo:${EMAIL}:${kind}:${name}`).digest();
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const result = (response, label) => {
  if (response.error) throw new Error(`${label}: ${response.error.message}`);
  return response.data;
};
const one = async (table, column, value, columns = "*") => result(
  await admin.from(table).select(columns).eq(column, value).maybeSingle(), `${table} lookup`,
);
const write = async (table, row, label) => {
  const existing = await one(table, "id", row.id, "id, business_id");
  if (existing && existing.business_id !== row.business_id) {
    throw new Error(`${label} ID belongs to another business; stopping.`);
  }
  return result(await admin.from(table).upsert(row, { onConflict: "id" }).select("id").single(), label);
};
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

async function findUser() {
  for (let page = 1; ; page++) {
    const response = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = result(response, "Auth user lookup").users;
    const match = users.find((user) => user.email?.toLowerCase() === EMAIL);
    if (match) return match;
    if (users.length < 1000) return null;
  }
}

const plaques = [
  { code: "DEMO001", name: "Front Counter", mode: "smart_page", purpose: "general", weight: 30, destination_url: "https://example.com/cedar-stone" },
  { code: "DEMO002", name: "Review Card — Register", mode: "direct_link", purpose: "review", weight: 25, destination_url: "https://example.com/cedar-stone/reviews" },
  { code: "DEMO003", name: "Main Menu", mode: "direct_link", purpose: "general", weight: 18, destination_url: "https://example.com/cedar-stone/menu" },
  { code: "DEMO004", name: "Patio Table", mode: "direct_link", purpose: "review", weight: 12, destination_url: "https://example.com/cedar-stone/reviews" },
  { code: "DEMO005", name: "Catering & Events", mode: "smart_page", purpose: "general", weight: 8, destination_url: "https://example.com/cedar-stone/catering" },
  { code: "DEMO006", name: "Loyalty / Social", mode: "smart_page", purpose: "general", weight: 7, destination_url: "https://example.com/cedar-stone/loyalty" },
];

const pages = {
  DEMO001: { heading: "Welcome to Cedar & Stone", subheading: "What can we help you find?", buttons: [
    ["View Our Menu", "https://example.com/cedar-stone/menu", 45],
    ["Leave Us a Review", "https://example.com/cedar-stone/reviews", 30],
    ["Visit Our Website", "https://example.com/cedar-stone", 15],
    ["Follow Us on Instagram", "https://example.com/cedar-stone/instagram", 10],
  ] },
  DEMO005: { heading: "Catering & Events", subheading: "Let us make your next event easy.", buttons: [
    ["View Catering Menu", "https://example.com/cedar-stone/catering-menu", 45],
    ["Request Catering", "https://example.com/cedar-stone/catering-request", 35],
    ["Visit Our Website", "https://example.com/cedar-stone", 20],
  ] },
  DEMO006: { heading: "Stay Connected", subheading: "Follow Cedar & Stone and keep up with what's new.", buttons: [
    ["Instagram", "https://example.com/cedar-stone/instagram", 50],
    ["Join Our Loyalty Program", "https://example.com/cedar-stone/loyalty", 35],
    ["Visit Our Website", "https://example.com/cedar-stone", 15],
  ] },
};

let randomState = 0x5eed2026;
const random = () => {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 4294967296;
};
const choose = (items, weight) => {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let value = random() * total;
  for (const item of items) {
    value -= weight(item);
    if (value < 0) return item;
  }
  return items.at(-1);
};
const easternParts = (date) => Object.fromEntries(
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", hourCycle: "h23" })
    .formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
);
const easternUtc = (day, hour, minute) => {
  const probe = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12));
  const zone = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "shortOffset" })
    .formatToParts(probe).find((part) => part.type === "timeZoneName")?.value;
  const offset = Number(zone?.match(/GMT([+-]\d+)/)?.[1] ?? -5);
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour - offset, minute));
};

async function insertMissingEvents(table, rows, plaqueIds, columns, signature) {
  const previous = [];
  const earliest = rows.reduce((date, row) => row.created_at < date ? row.created_at : date, rows[0].created_at);
  for (let offset = 0; ; offset += 1000) {
    const batch = result(await admin.from(table).select(columns)
      .in("plaque_id", [...plaqueIds]).gte("created_at", earliest)
      .order("created_at").order("id").range(offset, offset + 999), `${table} existing events`);
    previous.push(...batch);
    if (batch.length < 1000) break;
  }
  const counts = new Map();
  for (const row of previous) {
    const key = signature(row);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const missing = rows.filter((row) => {
    const key = signature(row);
    const count = counts.get(key) ?? 0;
    if (count) { counts.set(key, count - 1); return false; }
    return true;
  });
  for (let index = 0; index < missing.length; index += 200) {
    const batch = missing.slice(index, index + 200);
    result(await admin.from(table).insert(batch), `${table} seed`);
    await pause();
  }
  return missing.length;
}

async function main() {
  let user = await findUser();
  if (user && user.app_metadata?.moderntap_demo !== true) {
    throw new Error("Demo email already exists without the ModernTap demo marker. No existing user was modified.");
  }
  const anchor = user?.app_metadata?.moderntap_demo_seed_anchor ?? new Date().toISOString();
  if (user) {
    user = result(await admin.auth.admin.updateUserById(user.id, {
      password: PASSWORD, email_confirm: true,
      user_metadata: { ...user.user_metadata, full_name: NAME },
      app_metadata: { ...user.app_metadata, moderntap_demo: true, moderntap_demo_seed_anchor: anchor },
    }), "Demo auth update").user;
  } else {
    user = result(await admin.auth.admin.createUser({
      email: EMAIL, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: NAME },
      app_metadata: { moderntap_demo: true, moderntap_demo_seed_anchor: anchor },
    }), "Demo auth create").user;
  }
  if (!user) throw new Error("Demo auth user was not returned.");

  const ownedBusinesses = result(await admin.from("businesses").select("id, name").eq("owner_id", user.id), "Business lookup");
  if (ownedBusinesses.length > 1 || (ownedBusinesses.length === 1 && ownedBusinesses[0].name !== BUSINESS)) {
    throw new Error("Demo user owns unexpected business data; stopping before modifying it.");
  }
  const business = ownedBusinesses[0] ?? result(await admin.from("businesses")
    .insert({ owner_id: user.id, name: BUSINESS }).select("id, name").single(), "Demo business create");

  const subscription = await one("subscriptions", "business_id", business.id, "business_id, stripe_customer_id, stripe_subscription_id");
  if (subscription?.stripe_customer_id || subscription?.stripe_subscription_id) {
    throw new Error("Demo business has a Stripe-linked subscription; stopping before modifying it.");
  }
  if (subscription) result(await admin.from("subscriptions").update({ status: "trialing" })
    .eq("business_id", business.id), "Demo subscription update");
  else result(await admin.from("subscriptions").insert({ business_id: business.id, status: "trialing" }), "Demo subscription create");

  const plaqueIds = new Map();
  const buttonIds = new Map();
  for (const plaque of plaques) {
    const existing = await one("plaques", "code", plaque.code, "id, business_id");
    if (existing && existing.business_id !== business.id) {
      throw new Error(`${plaque.code} belongs to another business; stopping before changing it.`);
    }
    const row = { business_id: business.id, code: plaque.code, name: plaque.name,
      destination_url: plaque.destination_url, active: true, mode: plaque.mode, purpose: plaque.purpose };
    const saved = existing
      ? result(await admin.from("plaques").update(row).eq("id", existing.id).eq("business_id", business.id)
          .select("id").single(), `${plaque.code} update`)
      : result(await admin.from("plaques").insert(row).select("id").single(), `${plaque.code} create`);
    plaqueIds.set(plaque.code, saved.id);

    const page = pages[plaque.code];
    if (!page) continue;
    const previous = await one("smart_pages", "plaque_id", saved.id, "id");
    const pageRow = { plaque_id: saved.id, heading: page.heading,
      subheading: page.subheading, theme_preset: "clean" };
    const savedPage = previous
      ? result(await admin.from("smart_pages").update(pageRow).eq("id", previous.id).eq("plaque_id", saved.id)
          .select("id").single(), `${plaque.code} Smart Page update`)
      : result(await admin.from("smart_pages").insert(pageRow).select("id").single(), `${plaque.code} Smart Page create`);
    const pageId = savedPage.id;
    const existingButtons = result(await admin.from("smart_page_buttons")
      .select("id, position").eq("smart_page_id", pageId), `${plaque.code} button lookup`);
    const entries = [];
    for (const [position, [label, destination_url]] of page.buttons.entries()) {
      const old = existingButtons.find((button) => button.position === position);
      const buttonRow = { smart_page_id: pageId, label, destination_url, enabled: true, position };
      const button = old
        ? result(await admin.from("smart_page_buttons").update(buttonRow).eq("id", old.id)
            .eq("smart_page_id", pageId).select("id").single(), `${plaque.code} button update`)
        : result(await admin.from("smart_page_buttons").insert(buttonRow).select("id").single(), `${plaque.code} button create`);
      entries.push({ ...buttonRow, id: button.id });
    }
    buttonIds.set(plaque.code, entries.map((button, index) => ({ ...button, weight: page.buttons[index][2] })));
  }

  const requestSpecs = [
    ["DEMO001", "Please update the design to match our fall menu branding and use warmer neutral tones.", "completed", 45],
    ["DEMO005", "Create a cleaner catering design with our events messaging more prominent.", "ready", 10],
    ["DEMO006", "We'd like a seasonal version for our autumn loyalty promotion.", "designing", 3],
  ];
  const now = new Date(anchor);
  for (const [index, [code, notes, status, daysAgo]] of requestSpecs.entries()) {
    await write("design_change_requests", {
      id: demoId("design", String(index)), business_id: business.id, plaque_id: plaqueIds.get(code),
      notes, status, created_at: new Date(now.getTime() - daysAgo * 86400000).toISOString(),
    }, `Design request ${index + 1}`);
  }
  const supportSpecs = [
    ["Analytics question", "Can you explain the difference between plaque taps and Smart Page clicks?", "resolved", 21],
    ["Update business information", "We recently changed our catering contact information and wanted to confirm everything is updated.", "open", 2],
  ];
  for (const [index, [subject, message, status, daysAgo]] of supportSpecs.entries()) {
    await write("support_tickets", {
      id: demoId("support", String(index)), business_id: business.id,
      category: "Account / software issue", subject, message, status,
      created_at: new Date(now.getTime() - daysAgo * 86400000).toISOString(),
      resolved_at: status === "resolved" ? new Date(now.getTime() - 18 * 86400000).toISOString() : null,
    }, `Support ticket ${index + 1}`);
  }
  await write("replacement_requests", {
    id: demoId("replacement", "patio"), business_id: business.id, plaque_id: plaqueIds.get("DEMO004"),
    reason: "Damaged", details: "Demo replacement for a damaged patio plaque.", status: "delivered",
    shipping_name: NAME, shipping_address_line1: "100 Demo Avenue", shipping_address_line2: null,
    shipping_city: "Cranford", shipping_state: "NJ", shipping_zip: "07016",
    tracking_number: "DEMO-DELIVERED-001", tracking_url: null,
    created_at: new Date(now.getTime() - 36 * 86400000).toISOString(),
  }, "Demo replacement");

  const today = easternParts(now);
  const todayDate = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const events = [];
  for (let dayIndex = 0; dayIndex < 90; dayIndex++) {
    const day = new Date(todayDate.getTime() - (89 - dayIndex) * 86400000);
    const weekday = day.getUTCDay();
    const weekend = weekday === 5 || weekday === 6 || weekday === 0;
    const quiet = random() < 0.12;
    const base = 6 + dayIndex * 0.11 + (dayIndex >= 60 ? 5 : 0);
    const count = Math.max(2, Math.round(base * (weekend ? 1.22 : 1) * (quiet ? 0.6 : 1) + (random() - 0.5) * 5));
    for (let ordinal = 0; ordinal < count; ordinal++) {
      const plaque = choose(plaques, (item) => item.weight);
      const hour = dayIndex === 89 ? Math.max(0, Math.min(today.hour, 8 + Math.floor(random() * 10)))
        : 8 + Math.floor(random() * 11);
      const timestamp = easternUtc(day, hour, Math.floor(random() * 60));
      if (timestamp >= now) timestamp.setTime(now.getTime() - (ordinal + 1) * 60000);
      events.push({ plaque_id: plaqueIds.get(plaque.code),
        created_at: timestamp.toISOString(), user_agent: "ModernTap demo seed" });
    }
  }
  // Give the presentation dashboard a few recent, accurately labelled visits.
  const elapsedTodayMs = Math.max(0, now.getTime() - easternUtc(todayDate, 0, 0).getTime());
  for (const [index, code] of ["DEMO001", "DEMO002", "DEMO004", "DEMO001"].entries()) {
    const age = Math.min((index + 1) * 7 * 60000, Math.max(1000, Math.floor(elapsedTodayMs / (index + 2))));
    events.push({ plaque_id: plaqueIds.get(code),
      created_at: new Date(now.getTime() - age).toISOString(), user_agent: "ModernTap demo seed" });
  }
  const insertedTaps = await insertMissingEvents("tap_events", events, new Set(plaqueIds.values()),
    "id, plaque_id, created_at, user_agent",
    (event) => event.user_agent === "ModernTap demo seed" ? `${event.plaque_id}|${new Date(event.created_at).toISOString()}` : null);

  const smartIds = new Set(["DEMO001", "DEMO005", "DEMO006"].map((code) => plaqueIds.get(code)));
  const codeById = new Map([...plaqueIds].map(([code, id]) => [id, code]));
  const smartTaps = events.filter((event) => smartIds.has(event.plaque_id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const clickCount = Math.min(420, smartTaps.length);
  const clicks = [];
  for (let index = 0; index < clickCount; index++) {
    const tap = smartTaps[Math.floor((index + 0.4) * smartTaps.length / clickCount)];
    const code = codeById.get(tap.plaque_id);
    const button = choose(buttonIds.get(code), (item) => item.weight);
    const timestamp = new Date(Math.min(new Date(tap.created_at).getTime() + 45000, now.getTime() - 1000));
    clicks.push({ plaque_id: tap.plaque_id, button_id: button.id,
      button_label_snapshot: button.label, created_at: timestamp.toISOString() });
  }
  const insertedClicks = await insertMissingEvents("smart_page_clicks", clicks, smartIds,
    "id, plaque_id, button_id, button_label_snapshot, created_at",
    (click) => `${click.plaque_id}|${click.button_id}|${click.button_label_snapshot}|${new Date(click.created_at).toISOString()}`);

  const reviewIds = new Set(["DEMO002", "DEMO004"].map((code) => plaqueIds.get(code)));
  const reviewEvents = events.filter((event) => reviewIds.has(event.plaque_id));
  const since = (days) => reviewEvents.filter((event) => new Date(event.created_at) >= new Date(now.getTime() - days * 86400000)).length;
  console.log(`Demo ready: ${BUSINESS}; ${plaques.length} plaques; ${events.length} seeded taps (${insertedTaps} added now); ${clicks.length} seeded Smart Page clicks (${insertedClicks} added now).`);
  console.log(`Review Page Visits (approximate rolling windows): today ${since(1)}, 7 days ${since(7)}, 30 days ${since(30)}, all time ${reviewEvents.length}.`);
  console.log("Sign in with demo@moderntap.test and the password supplied through MODERNTAP_DEMO_PASSWORD.");
}

main().catch((error) => {
  console.error("Demo seed failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
