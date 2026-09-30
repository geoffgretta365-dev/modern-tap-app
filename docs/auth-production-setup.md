# ModernTap authentication setup

No hosted Supabase settings have been changed by this implementation.

## Findings

The shared auth layout and login/signup each rendered a logo. The layout now owns the single logo/Business Portal treatment across all auth pages. Onboarding already has one brand header and is outside this layout.

Previously signup used the browser origin plus `/onboarding`, password recovery used the origin plus `/auth/update-password`, and there was no PKCE code exchange. Signup always showed a confirmation screen even when a session was returned. These application issues are fixed.

A signup performed on the production hostname did **not** construct localhost in the old code. The reported localhost email therefore points to hosted URL/template configuration (or an old email), not an explicit localhost signup URL in that component. The deployed Site URL, redirect allowlist, email templates, and Confirm Email switch could not be directly inspected from repository files. Do not treat local Supabase configuration as evidence of hosted settings.

## Manual production settings (before testing the updated deployment)

In Vercel → project → Settings → Environment Variables:

- Set server-only `MODERNTAP_APP_URL=https://modern-tap-app.vercel.app` for Production.
- Leave `MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED` absent/false.
- A future deployment is needed for code/environment changes to take effect. Nothing was deployed here.

In Supabase → **Modern Tap MVP** → Authentication → URL Configuration:

- **Site URL:** `https://modern-tap-app.vercel.app`
- **Redirect URLs:** explicitly allow:
  - `https://modern-tap-app.vercel.app/auth/confirm?next=/onboarding`
  - `https://modern-tap-app.vercel.app/auth/confirm?next=/auth/update-password`
  - `http://localhost:3000/auth/confirm?next=/onboarding`
  - `http://localhost:3000/auth/confirm?next=/auth/update-password`
- During the transition, retain existing valid production redirect entries for outstanding emails.
- Preview builds use Vercel's server-provided `VERCEL_URL`. Add the two exact callback URLs for any specific trusted preview you want to test. Do not allow all `*.vercel.app` sites. Use a non-production Supabase project for preview testing where possible.

Authentication → Email Templates (or Notifications → Email in the updated dashboard): inspect **Confirm signup** and **Reset password**. Remove any literal localhost links. The standard `{{ .ConfirmationURL }}` link is supported: Supabase verifies the email then redirects to `/auth/confirm` with a PKCE code. Open the email in the same browser that initiated signup/reset because PKCE requires its stored verifier.

If the project already uses server-side token-hash templates, these supported targets avoid a browser-bound PKCE verifier:

- Confirm signup: `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`
- Reset password: `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery`

These templates assume the new application-provided RedirectTo values above already contain `?next=`. In HTML use `&amp;` for the ampersands. Do not append tokens to `{{ .ConfirmationURL }}`. Do not mix token verification with a second code exchange. Review existing invite/email-change templates separately before replacing them.

## Optional immediate signup

Supabase → Authentication → Sign In / Providers → Email → **Confirm email: OFF** (called Providers → Email in some dashboard versions). Save only if you want accounts usable without proof of ownership of the supplied email address. This is supported by Supabase; it does not remove password authentication or change application ownership/RLS checks. Email addresses must no longer be treated as verified identity solely because signup succeeded. Password recovery still requires the recovery email.

- OFF: create account → returned session → onboarding → tour → billing → plan review → Stripe Checkout.
- ON: create account → confirmation screen → email verification → server callback establishes session → onboarding → tour → billing.
- Existing subscription/customer guards remain unchanged and route established subscribers onward appropriately.

Changing Supabase's switch/URL settings does not require a Vercel redeploy. Changing Vercel environment variables does. Generate fresh emails after correcting settings; old emails retain old destinations.

## Acceptance checks

Use a dedicated test account, not customer records. Verify signup in both configured modes, sign-in, confirmation, expired/reused links, password recovery, onboarding, and the existing subscriber bypass. Test production only after you explicitly choose to deploy these changes and configure Supabase. Do not apply entitlement migrations or enable the flag as part of this work.

Review all five tour steps on phone, tablet and desktop. Try demo taps, mode/destination changes, analytics periods, all presets, heading edits, action selection and icon toggle; then Back, Skip and Choose Your Plan. All demo interactions remain in local React state. Only the billing links navigate.

References: https://supabase.com/docs/guides/auth/redirect-urls, https://supabase.com/docs/guides/auth/passwords, https://supabase.com/docs/guides/auth/general-configuration
