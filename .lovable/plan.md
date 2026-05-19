## 1. Premium unlock audit (Stripe → Pro role)

**Current flow (verified):**
- `Pricing.tsx` → redirects to Stripe Payment Link with `client_reference_id = user.id`
- `stripe-webhook` edge function → verifies signature, upserts `subscribers` row with `subscribed=true, subscription_tier='Pro', subscription_end=…`
- `usePremium` hook → reads `subscribers`, treats `subscribed && (end is null || end > now)` as Pro
- `PremiumGate` component → wraps gated pages

**Small fixes I'll apply:**
- In `stripe-webhook`, `checkout.session.completed` currently uses `s.expires_at` for `subscription_end` (that's the *checkout session* expiry, not the subscription period). I'll switch to fetching the subscription period via the `subscription` object on the session, falling back to `invoice.payment_succeeded` (which already sets it correctly).
- Add `customer.subscription.updated` handler so plan changes / renewals refresh `subscription_end` and `subscribed` accurately — this is what makes "premium for as long as they pay" automatic. When Stripe cancels at period end, `subscribed` flips to false.

**Manual test guide (Stripe test mode):**
1. In Stripe Dashboard → switch to Test mode → use the Payment Link in test mode (or create a test one)
2. Sign in to the app with a test user → go to `/pricing` → click Pro → checkout with card `4242 4242 4242 4242`
3. Watch the webhook in Supabase → `stripe-webhook` logs should show `checkout.session.completed`
4. Run in SQL editor: `select * from subscribers where email = '<your email>'` → confirm `subscribed=true`
5. Refresh the app → gated pages should unlock immediately (the hook re-checks on window focus)
6. To test downgrade: in Stripe → cancel the test subscription → webhook fires `customer.subscription.deleted` → `subscribed=false` → pages re-lock

## 2. Push notifications for new bookings (Web + iOS)

### Database
- New table `push_subscriptions(user_id, endpoint, p256dh, auth, platform, created_at)` for Web Push
- New table `device_tokens(user_id, token, platform, created_at)` for APNs
- DB trigger on `notifications` INSERT → calls `send-push` edge function via `pg_net` (so pushes fire even when app is closed)

### Web Push (PC + Android + installed iOS PWA)
- Generate VAPID key pair (I'll need you to add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` as secrets)
- `public/sw.js` service worker — listens for `push` events, shows notification, deep-links on click
- `src/lib/push.ts` — registers SW, requests permission, subscribes, stores subscription in DB
- Settings page → "Enable booking alerts" toggle
- `send-push` edge function fans out to all subscriptions for the booking owner

### Native iOS (APNs)
- `send-push` edge function also sends to APNs via JWT auth (token-based, no certs)
- Needs these secrets from you (Apple Developer account):
  - `APNS_KEY_ID` (10-char Key ID)
  - `APNS_TEAM_ID` (10-char Team ID)
  - `APNS_BUNDLE_ID` (e.g. `com.cutzio.app`)
  - `APNS_PRIVATE_KEY` (contents of the `.p8` file)
  - `APNS_USE_SANDBOX` (`true` for dev, `false` for prod)
- iOS app changes (in `ios/CutzioApp`):
  - Register for remote notifications on launch
  - Upsert the device token into `device_tokens` via Supabase Swift SDK after sign-in
  - I'll provide the Swift snippet to drop in

### After approval
I'll: apply the webhook fixes → run migrations for the two tables + trigger → write the service worker + push lib → write `send-push` edge function → request the VAPID + APNs secrets → give you the iOS snippet and test steps.

If you don't have APNs credentials handy, I can ship Web Push fully working today and stub the APNs path so it activates the moment you add the secrets.
