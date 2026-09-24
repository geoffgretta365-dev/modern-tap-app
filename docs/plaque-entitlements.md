# Active plaque entitlements and plan changes

## Status and audit

The migration file is intentionally not applied to Supabase. Read-only deployed PostgREST metadata confirmed `plaques.active` is a required boolean, default true; IDs/business IDs are UUIDs. `subscriptions` exposes status and Stripe subscription/price/customer IDs. PostgREST metadata does not expose the deployed RLS policy bodies, so those policies were **not** assumed or claimed to be verified.

Before this change, `app/plaques/new/new-plaque-form.tsx` inserted active plaques from the browser. Customer destination/Smart Page/purpose edits and admin name/destination edits do not change active state. No existing admin activation/creation route was found. The demo seed script creates/reactivates plaques with the service role; after this migration it also requires an explicitly configured allowance and a persisted active/trialing Stripe subscription. Do not run that script against production to test entitlements.

The new creation and status APIs derive the business from authenticated ownership; the database trigger is the final authority, including for direct Supabase inserts/updates and service-role inserts. Existing public `/t/[code]`, `/s/[code]`, and Smart Page click/media routes already filter active plaques. Inactive plaques receive the existing neutral not-found/unavailable response and create no tap/click record. Historical records and Smart Page settings are untouched by deactivation.

## What the migration adds

`supabase/migrations/20260925_enforce_active_plaque_limits.sql` adds a private approved-price/limit mapping, a private per-business active counter, and a short-lived plan-change lease. It initializes counters from existing active plaques while holding a table write lock. It does not disable, delete, or change existing plaques or subscription records. Plan keys and limits have a database CHECK constraint matching the approved catalog. Future tier-limit changes must update both the catalog and this constraint deliberately.

An AFTER-row trigger updates the counter in the same transaction as each active-state change. A conditional `UPDATE ... WHERE active_count < maximum` obtains a row lock; two concurrent transactions cannot take the last slot. Failed requests roll back both the plaque and counter. No-op conflicts and unchanged active states do not increment the counter. Inactive rows do not count. A subscription row share lock protects the price/status decision during the increment. Existing over-limit businesses retain all plaques and can deactivate them, but cannot increase the count.

The trigger separately checks ownership, forbids plaque transfers through ordinary updates, and checks persisted active/trialing status plus a Stripe subscription reference. Customers cannot write the private mapping/counter or reserve Stripe-change leases. Customer writes to `subscriptions` are revoked, including column-level grants, without changing customer read access or webhook service-role writes. Existing table RLS policies remain intact.

Unknown/legacy Stripe prices are not silently assigned a standard limit. They keep app access and existing active plaques but require an approved mapping before further activation. Manual custom mappings use a distinct price and a maximum of at least 31. A `legacy` mapping permits an explicitly agreed positive allowance without relabelling old subscriptions as a new tier. Never reuse a shared standard price for a customer-specific override.

## Local test setup (manual; no production changes)

1. **Modern Tap MVP is production. Leave its `.env.local` unchanged.** Follow [the isolated local Supabase workflow](local-supabase.md) to obtain a reviewed schema baseline and run with local credentials plus Stripe Sandbox. Do not apply this migration to production tonight.
2. Inspect your deployed RLS policies and grants in the SQL editor before applying. The new trigger protects active-count mutations regardless of permissive plaque-write policies, but normal business ownership/RLS remains required for the rest of the app.
3. Run `20260925_enforce_active_plaque_limits.sql` in that test database. The mapping starts empty: creation/reactivation fail closed until step 4. Existing pages and plaques remain accessible.
4. As an SQL administrator, populate the private mapping using the SAME sandbox Price IDs configured in the four server environment variables. Replace the placeholders; do not run them literally:

```sql
insert into moderntap_private.price_entitlements
  (stripe_price_id, plan_key, maximum_active) values
  ('REPLACE_WITH_STRIPE_PRICE_STARTER', 'starter', 5),
  ('REPLACE_WITH_STRIPE_PRICE_GROWTH', 'growth', 10),
  ('REPLACE_WITH_STRIPE_PRICE_PRO', 'pro', 20),
  ('REPLACE_WITH_STRIPE_PRICE_BUSINESS', 'business', 30);
```

5. Confirm each Stripe sandbox price is recurring USD monthly, licensed per-unit, quantity one, with amounts matching the catalog. Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` configured. Start the existing Stripe CLI sandbox webhook forwarding to `http://127.0.0.1:3000/api/stripe/webhook` and use `node scripts/local-supabase.mjs dev`, not plain `npm run dev`, for the isolated environment. Listen for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
6. In the sandbox Customer Portal configuration, disable subscription product/price/quantity changes. Keep payment-method, invoice and appropriate cancellation features. The portal endpoint now checks the default configuration and refuses to return a session if plan/quantity updates are enabled, preventing this route from bypassing ModernTap checks. Until that setting is corrected, Manage Subscription shows a configuration message. Plan changes should go through ModernTap's controlled endpoint. Stripe Dashboard/operator changes remain privileged external operations; they can lower a limit below existing usage, so operators must check counts. Such a change never automatically disables plaques, but blocks further increases.
7. Use a fictional test business with a webhook-created subscription. Fill Starter to 5 active, try a manual API request and direct `/plaques/new`, deactivate one, then reactivate/create. Upgrade to Growth and confirm that the allowance remains 5 until the webhook stores the new price. Test a payment requiring attention, webhook delay, two simultaneous requests, and Business at 30. Never use live customer records.
8. For a custom test, use a separately agreed/custom Stripe Price ID already available to you and explicitly insert a `custom` allowance. This application neither creates that price nor sells Custom automatically.

There is no public contact address in source. “Contact ModernTap” points to the Billing plan-change explanation and instructs the owner to contact their ModernTap representative.

## Upgrade and downgrade behavior

Installed Stripe SDK: 22.6.2. `POST /api/stripe/change-plan` accepts only a catalog key. It verifies ownership, persisted subscription, current Stripe customer/subscription/item/price, target price amount/interval, and the target database allowance. It rejects ambiguous multi-item, pending, scheduled, canceling, paused, non-automatic-collection or unpaid-invoice subscriptions. A database lease serializes app-initiated updates; an idempotency key prevents duplicate processing. An ambiguous failure retains the lease for up to ten minutes.

The existing item on the existing subscription is updated with `proration_behavior: always_invoice` and `payment_behavior: pending_if_incomplete`. The UI discloses the immediate prorated charge before confirmation. Stripe handles payment and any required action; a pending update does not increase the saved allowance. No new Checkout Session or subscription is created, and no subscription row is written by this endpoint. The existing webhook is the sole sync path. Refresh Billing to see confirmation.

Downgrades are intentionally **not automatic**, even when usage fits. If usage exceeds the target, the UI/API gives the exact number to deactivate. If it fits, it directs the customer to arrange an end-of-period change with ModernTap. No scheduling, automatic refunds, deletions or deactivations are introduced.

## Automated tests

Normal application/browser tests: `node --test tests/*.test.mjs` (browser requires Chrome).

The PostgreSQL integration test is optional without external test tooling and explicitly reports a skip. To run it, install `embedded-postgres` and `pg` into a disposable directory outside the repository, enable its documented local symlink hydration script if your npm blocks install scripts, and set `MODERNTAP_PG_TOOLS` to that directory:

```sh
MODERNTAP_PG_TOOLS=/path/to/temporary/test-tools node --test tests/plaque-entitlements.postgres.test.mjs
```

It creates and stops a fresh localhost PostgreSQL cluster with synthetic schema and records. It never loads `.env.local`, takes an external database URL, or connects to Supabase. It tests the migration itself, actual row locks using two database connections, limits, direct SQL attempts, reactivation, history retention, rollback and protected privileges. A passing synthetic-schema test is not a claim that your existing deployed RLS policies were inspected or modified.

## Staged deployment feature flag

`MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED` is server-only and defaults to false. Only the exact value `true` enables it. Leave it absent for the pre-migration deployment.

With the flag off, the app never calls the new entitlement RPCs. Plaque creation uses the existing owned-business insert through the authenticated Supabase client, retaining existing RLS. The app hides usage/activation controls and Change Plan; direct activation/upgrade requests return 404 and the plan-change page redirects to Billing. Stripe Portal uses its original session flow. Tours, plan selection/review/Checkout, webhook activation, auth, editing and tracking remain available.

After installing and verifying the migration and mappings, set the server flag to `true` and restart/redeploy. Existing local sandbox files can opt in by adding this same variable; the local launcher passes it through. Missing configuration with the flag on still fails closed.

Turning the application flag off does **not** remove database triggers after the migration has been applied. It is a pre-migration rollout gate, not a database rollback mechanism. Flag-off mode against the current production schema has no new database dependencies, but deployment still needs the correct Stripe/environment configuration and prior already-used Smart Page migrations.
