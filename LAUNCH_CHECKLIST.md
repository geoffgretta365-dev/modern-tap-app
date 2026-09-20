# ModernTap launch checklist

Check each item in the local app and production configuration before committing or launching.

## Database

- [ ] Confirm all migrations, including review purpose, design requests, and Smart Page appearance/storage, are applied in production.

## Auth

- [ ] Sign up, log in, log out, and reset a password.
- [ ] Verify Supabase redirect URLs for the production domain.

## Plaques

- [ ] Add a Direct Link and a Smart Page plaque; edit both.
- [ ] Change General/Review Card purpose and verify plaque status badges.

## Smart Pages

- [ ] Save appearance, logo, and buttons; verify preview and published page.
- [ ] Add, edit, enable, disable, reorder, and delete a button.
- [ ] Test the physical NFC `/t/[code]` route and tracked button link.

## Analytics

- [ ] Verify taps and Eastern Time dates across daylight saving transitions.
- [ ] Verify Review Page Visits count only Review Card taps.
- [ ] Verify Smart Page clicks are reported separately from taps.

## Requests

- [ ] Submit and review support, physical replacement, and design requests.

## Billing

- [ ] Subscribe, open the Stripe portal, and verify webhook updates.

## Mobile

- [ ] Review dashboard, plaques, analytics, and Smart Page editor at phone and tablet widths.
- [ ] Verify navigation drawer and install icon/manifest.

## Production

- [ ] Configure required Vercel environment variables without putting values in this file.
- [ ] Configure custom domain and Stripe production webhook URL.
- [ ] Confirm Supabase redirect URLs and the permanent domain encoded into NFC plaques.
- [ ] Check production build and manually test the routes above before committing or pushing.
