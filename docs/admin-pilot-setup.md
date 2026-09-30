# Admin pilot setup

## Apply the SQL before deploying the pilot UI

Run the complete contents of `supabase/migrations/20260929_add_admin_pilots.sql` in the Supabase SQL Editor as the database administrator. The file is a single transaction. It has **not** been applied to production by this implementation. Do not run all pending migrations: this task does not enable plaque entitlements or change billing.

The migration works both before and after the optional `20260925_enforce_active_plaque_limits.sql` migration. If that older entitlement migration is installed later, run the conditional `do $migration$ ... $migration$;` block from the pilot migration again afterward; the old migration otherwise installs its original subscription-required trigger. Do not rerun the entire pilot migration because its columns and policy already exist.

## Schema evidence and boundaries

On 2026-09-29, a read-only PostgREST OpenAPI request verified the deployed shapes of `businesses`, `plaques`, `tap_events`, and `subscriptions`. It fetched schema metadata only, no customer rows. The repository has incremental migrations but no original schema migration or generated Supabase types.

- Businesses: UUID primary key with `gen_random_uuid()` default; required `owner_id`, `name`, `created_at` (default `now()`). The migration drops the owner NOT NULL requirement.
- Plaques: required UUID `business_id` referencing businesses; unique codes are generated in the same uppercase, dashless UUID format as the customer route; required `name`, `code`, `destination_url`, `active`, `created_at`, `mode`, `purpose`. Defaults include active true, mode `direct_link`, purpose `general`.
- Tap events: bigint primary key, required plaque UUID foreign key and creation timestamp; optional user-agent and visitor/device/location metadata. Existing `/t/[code]` records the tap before redirecting.
- Subscriptions: UUID business foreign key, required status defaulting to inactive, optional Stripe references and period end. Pilot creation inserts no subscription row.

PostgREST metadata does not expose the deployed policy/trigger definitions. The migration preserves existing policies and adds a restrictive owner boundary to businesses for both anon and authenticated roles, so an existing permissive policy cannot expose another owner's or an ownerless business. A trigger prevents customer writes to all pilot fields while permitting existing ordinary business creation/name updates. The service-role client is explicitly server-only.

When entitlement enforcement already exists, the migration replaces its capacity function with the same ownership, capacity and counter behavior plus an exception requiring BOTH service-role JWT and `is_pilot = true`. The counter continues tracking pilot inserts/deactivation/reactivation, and customer requests get no exception, even if later assigned ownership of a pilot. The new HTTP creation route additionally requires the admin user allowlist and rejects non-pilot businesses. Existing customer plaque creation code is unchanged.

## Configuration and use

- Set server-only `MODERNTAP_ADMIN_USER_IDS` to comma-separated admin auth user UUIDs.
- Set `MODERNTAP_APP_URL` to the canonical deployed app origin (for example `https://modern-tap-app.vercel.app`). Full NFC URLs use this configured origin, never request headers. Local development falls back to localhost.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. No new billing or subscription settings are required.
- Open `/admin` → **Create pilot restaurant**. Enter the business, start date, length, optional Google review baseline, and notes.
- The default start date is today in America/New_York; dates are stored at UTC midnight and the end is start + duration days. These dates record the pilot window; they do not automatically disable plaques.
- On the business page, add a batch named “Table”, placement Table, quantity 12, with the Google review destination. Repeat for “Checkbook”, placement Checkbook, quantity 12.
- Copy each full tap URL into the NFC writer. Batch names are numbered; each code is unique. Copying a URL does not create a tap event.
- Tap a programmed tag, then select **Refresh activity** on the admin business page. The existing plaque counts and Recent Taps display that activity. Taps are not confirmed Google reviews.

The batch insert is atomic. If the server returns a database error, no part of that batch is saved. If the network drops after submission, reload the business page and check its plaques before retrying, since the response may have been lost after a successful save.

## Verification

`tests/admin-pilots.test.mjs` exercises the real route functions and server-rendered page with isolated database/auth mocks, including 403s, input validation, ownerless creation, 24 unique plaques, tap recording/display, and cross-business plaque rejection. Existing customer entitlement route tests remain in the full suite.

`tests/admin-pilots.postgres.test.mjs` applies the real migration to fresh disposable local PostgreSQL instances, with and without optional entitlements. It tests RLS with a deliberately permissive pre-existing policy, protected fields, batch rollback, service-role pilot bypass, maintained counters, and unchanged customer/non-pilot limits. These are isolated schema fixtures informed by metadata, not a full copy of production RLS.

`tests/admin-pilots.browser.test.mjs` renders the actual page layouts and hydrates the new components with fixture data and mocked network calls. It checks forms, copy feedback, and responsive overflow. No production restaurant, plaque, user or tap is created by tests. A real phone/NFC end-to-end check remains for after the migration and deployment.
