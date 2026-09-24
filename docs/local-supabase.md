# Tonight: isolated local Supabase + Stripe Sandbox

## Current findings and stop point

**Modern Tap MVP is production. Do not apply tonight's migration there.**

The repository has four incremental migrations but no original schema migration, `supabase/config.toml`, SQL seed, or complete RLS baseline. The first migration already assumes `public.plaques` exists; the others assume `smart_pages` and `smart_page_buttons`. Therefore `supabase start` in the repository root cannot reconstruct ModernTap from scratch. Do not substitute the deliberately simplified PostgreSQL test fixtures for the app schema.

Supabase CLI, Docker CLI/Desktop, and Homebrew were not found during inspection. Node 24 and npm are available. Existing scripts are `dev`, `build`, `start`, `lint`, and `seed:demo`. **Do not run `seed:demo`: it loads the existing production `.env.local` and writes records.** The tour needs no seed.

No project was contacted, linked, started, reset, or migrated while preparing this workflow. Production `.env.local` was not edited. No sandbox credentials have been copied or printed.

## 1. Install local prerequisites (manual)

Install Docker Desktop for Apple Silicon from https://docs.docker.com/desktop/setup/install/mac-install/ and open it. Wait until its engine is running. In a new Terminal:

```sh
cd /Users/geoffreygretta/Desktop/moderntap-app
docker --context desktop-linux info
npx --yes supabase@2 --version
mkdir -p .local-supabase
chmod 700 .local-supabase
```

These download/check tooling, not a hosted Supabase project. This workflow specifically uses Docker Desktop's **local Unix-socket** `desktop-linux` context. Do not select a remote Docker context. No Supabase login or project linking is required.

## 2. Obtain the missing schema-only baseline — STOP here for review

An existing authoritative schema-only export is best. We need the current production schema **after Smart Page V2 and before entitlement enforcement**, including table definitions, indexes, foreign keys, functions, grants and RLS policies. No customer rows, auth users, production storage objects, passwords, or Stripe IDs.

If no export exists, a **human-run, read-only** schema dump is required. This is the only step below that contacts production. It is optional until you authorize/run it yourself; the prepared helpers cannot perform it. `db dump` does not apply migrations. Do not use `db pull`, `migration repair`, `db push`, `link`, or a remote reset for this task.

For a public-schema export, use your production Postgres **session-pooler** connection URI privately. It must use the database password, not a Supabase API key. At a local zsh Terminal, enter the URI at the hidden prompt; do not paste it into chat or include it literally in command history:

```sh
read -s 'MODERNTAP_SCHEMA_URL?Production DB URI for READ-ONLY schema export: '
printf '\n'
(umask 077; npx --yes supabase@2 db dump --db-url "$MODERNTAP_SCHEMA_URL" --schema public --file .local-supabase/public-schema.sql)
unset MODERNTAP_SCHEMA_URL
```

Do not add `--data-only` or export customer/auth rows. Keep this file private and ignored by Git. A public-schema dump alone may omit custom triggers/policies on `auth`/`storage`, extension setup, and bucket configuration. Have the schema reviewed before importing it. Existing schema SQL from your original setup can supply those missing definitions without contacting production. Full Auth/Storage *system-schema* dumps must not be blindly restored over the schemas provided by the local stack.

**Next handoff:** report that Docker works and the private `.local-supabase/public-schema.sql` file exists. Have Codex review it locally without printing sensitive definitions, identify any missing managed-schema customizations, and assemble `.local-supabase/baseline.reviewed.sql`. Review must also remove/neutralize production webhook/HTTP/cron integrations, confirm the Postgres major version and inspect ownership/RLS. Do not simply rename the file and assume review passed.

The subsequent steps are ready, but should wait until that concrete baseline is reviewed. This missing baseline prevents claiming full local setup is complete today.

## 3. Prepare and start the separate local project (after baseline review)

```sh
node scripts/local-supabase.mjs prepare
```

This only copies files. It creates `.local-supabase/supabase/config.toml` and two migrations: the reviewed current baseline, followed by the new entitlement migration. It does not copy/replay the older incremental migrations because they are already represented in the current baseline. The root migration history is unchanged. The template defaults to Postgres 17; adjust the private config if the reviewed export requires a different supported major version.

Review the private config, then start the fresh local stack:

```sh
DOCKER_CONTEXT=desktop-linux DOCKER_HOST= npx --yes supabase@2 start --workdir .local-supabase
```

On a fresh stack, startup applies those two migrations to **local** Postgres. If startup fails, stop and inspect the baseline error; do not try a remote push/repair. This workflow intentionally supplies no automatic reset command. Never link `.local-supabase` to a hosted project.

Local addresses: API `http://127.0.0.1:54321`, database port `54322`, Studio `http://127.0.0.1:54323`, email inbox `http://127.0.0.1:54324`. The local auth config enables email confirmation. In local Studio, create a **private** `smart-page-assets` storage bucket if absent, matching reviewed bucket MIME/size settings. No production files are copied. Review any original storage policies/functions too; do not invent broader policies for convenience.

## 4. Private sandbox settings and local mappings

```sh
node scripts/local-supabase.mjs env
```

This captures local CLI status without printing keys, then creates a mode-0600 `.env.sandbox.local` template. Fill it **privately in your editor** with the existing sandbox Stripe secret and four price IDs. You may manually copy only those Stripe sandbox values from `.env.local`; do not copy its Supabase credentials. Leave `.env.local` untouched.

In a separate Terminal, use the existing Stripe CLI authenticated to the **Sandbox**, not live:

```sh
./node_modules/.bin/stripe listen --forward-to http://127.0.0.1:3000/api/stripe/webhook --events checkout.session.completed,customer.subscription.updated,customer.subscription.deleted
```

If that executable is unavailable, use your existing working `stripe listen` command with the same arguments. Never use `--live`. Put the listener's signing secret in `.env.sandbox.local` as `STRIPE_WEBHOOK_SECRET`; do not paste it into chat. Keep the listener running.

Then:

```sh
node scripts/local-supabase.mjs map
```

The mapper refuses non-test Stripe keys; retrieves the four prices in the sandbox and verifies USD/month amounts, active state and `livemode=false`; then writes only to the fixed **local Docker database container**. It never prints price IDs or writes them to migrations/source files. SQL goes through stdin, and provider/SQL errors are redacted.

After migration and mapping succeed, set `MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED=true` privately in `.env.sandbox.local` to test entitlements. Without it, the application intentionally uses pre-migration behavior.

Mappings: Starter 5, Growth 10, Pro 20, Business 30. No Custom or legacy prices are silently mapped. Disable product/price/quantity updates in the Sandbox default Customer Portal configuration, keeping invoice/payment-method management enabled.

## 5. Run Next.js without overwriting production .env.local

Stop any existing dev server on port 3000 first. Then:

```sh
node scripts/local-supabase.mjs dev
```

Open **http://127.0.0.1:3000** in a separate browser profile. The launcher reads credentials directly from local CLI status, refuses remote URLs/linked workdirs/remote Docker contexts, and injects the local Supabase credentials into the Next child process. Stripe values come only from `.env.sandbox.local`, and only test secrets are accepted.

It clears inherited application variables and shadows every environment-variable name found in repository dotenv files before injecting local values. This prevents Next's automatic `.env.local` loading from supplying production fallbacks. No production file is overwritten, renamed, or copied. Normal source edits still hot reload. Use this launcher throughout tonight; **plain `npm run dev` still uses your production `.env.local`.** Stop the child with Ctrl+C when finished.

Create a new fictional user; confirm the email in the local inbox, onboard, tour, choose a plan, and use Stripe Sandbox Checkout. Do not create a fake subscription row manually: let the local webhook persist the sandbox subscription.

## Testing and tomorrow

Test Starter at 5, inactive records not counting, deactivation/reactivation, direct creation/API attempts, upgrades and payment-required cases, webhook delay, Business at 30, blocked downgrades and all four interactive tour steps. Test local Smart Page uploads too once storage configuration is verified. Confirm zero test records appear in production by design—not by connecting tools to production tonight.

Stop local services, preserving local data:

```sh
DOCKER_CONTEXT=desktop-linux DOCKER_HOST= npx --yes supabase@2 stop --workdir .local-supabase
```

Tomorrow's live migration/mapping/deployment is a separate reviewed operation. Never copy sandbox price mappings or the private combined local baseline to production. The current entitlement migration should be promoted only after full local Auth/RLS/Storage/Stripe tests pass.

References: https://supabase.com/docs/guides/local-development/cli/getting-started , https://supabase.com/docs/reference/cli/supabase-db-dump , https://nextjs.org/docs/app/guides/environment-variables .
