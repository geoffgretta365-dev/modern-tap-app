# ModernTap demo account

This account contains fictional data for sales presentations. It must not be used as a production admin account or as evidence of real customer reviews, payments, or conversions.

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MODERNTAP_DEMO_PASSWORD` (at least 12 characters)

Set these in your shell or a local environment file that your shell loads. The seed command does not automatically read `.env.local`. Do not commit the password or service-role key, and do not use the demo password as a production admin password.

## Run once or refresh the demo

```sh
npm run seed:demo
```

The command creates or updates only the marked demo auth user and its Cedar & Stone Café business. It checks ownership before using the fixed `DEMO001`–`DEMO006` plaque codes. Requests have deterministic IDs, and seeded activity is matched by timestamp and demo-owned plaque/button, so reruns do not duplicate rows. The first run fixes the timeline anchor; reruns preserve that timeline. The script stops if the demo email or codes belong to an unmarked account or another business. It never calls Stripe or deletes table data.

Sign in at `/auth/login` with **demo@moderntap.test**. The password is the value you supplied through `MODERNTAP_DEMO_PASSWORD`; the script never prints it.

The sample links use `example.com` paths. The account is intended for portal walkthroughs; replace destinations manually if a live destination demonstration is needed.
