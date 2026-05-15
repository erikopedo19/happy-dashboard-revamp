# Plan

## 1. Settings → simple "Your plan" card

Replace the full pricing table inside Settings with a compact iOS-style card:

- Title: **Your plan** · Badge: `Free` or `Pro`
- One line: "Active until Jun 14" (Pro) or "Upgrade to unlock map listing & unlimited bookings" (Free)
- Single primary button: **Manage plan** → navigates to `/pricing`

The full `PricingTableOne` lives only on `/pricing`. No more inline pricing on Settings.

## 2. Stripe: payment-link only, no secret key

Stop calling Stripe's API. Remove dependency on `STRIPE_SECRET_KEY`.

- Drop `check-subscription`, `create-checkout`, `customer-portal` invocations from the client.
- New table column already exists (`subscribers.subscribed`); we'll read it directly via the Supabase client (RLS: own row only).
- Subscription state is updated by a **Stripe webhook** (signature-verified, no secret key needed for our app — just `STRIPE_WEBHOOK_SECRET`):
  - `checkout.session.completed` → set `subscribed = true`, `subscription_end = period_end`
  - `customer.subscription.deleted` / `invoice.payment_failed` → set `subscribed = false`
- "Manage subscription" becomes a plain link to Stripe's hosted **customer portal link** (configurable in Stripe dashboard, no API call).
- Until the webhook is wired in Stripe dashboard, status stays at whatever's in the DB (manual toggle works for testing).

## 3. Address pasted → auto map marker

In Settings → Business identity, the address field already exists. Add:

- On blur of the address input, geocode via a free provider (Nominatim — no API key) and write `latitude` / `longitude` to `profiles`.
- Small inline preview map below the field showing the pinned location (read-only MapLibre).
- The existing public `BarbershopMap` (FindBarbershop page) already reads `list_public_shops()` which returns lat/lng — clients will see the new pin automatically once `is_public = true`.

## 4. Mobile admin UI polish (iOS clean)

Pass over the admin pages at ≤414px:

- Remove heavy colored tab pills / gradient chips → use neutral `bg-muted` with rounded-2xl, single accent color only on active state.
- Cards: `rounded-3xl`, `border-[#E5E5EA] dark:border-[#2C2C2E]`, no shadow except a soft `shadow-[0_1px_2px_rgba(0,0,0,0.04)]`.
- Replace any colored icon backgrounds (purple/blue/green tinted boxes) with monochrome `bg-muted` + `text-foreground` icons.
- Tighter spacing: `px-4 py-5` sections, larger touch targets (44px min).
- Pages in scope: Dashboard, Agenda, Customers, Settings, Products. Skip desktop (≥768px) — keep current.

## Files touched

- `src/components/SubscriptionCard.tsx` — rewrite as compact card
- `src/pages/Pricing.tsx` — already exists, keep
- `src/pages/Settings.tsx` — add geocode-on-blur + inline preview map for address
- `src/components/ui/map.tsx` — add `<AddressPreviewMap lat lng />` variant
- `src/lib/geocode.ts` — new, Nominatim wrapper
- `supabase/functions/stripe-webhook/index.ts` — new, signature-verified webhook
- Delete: `supabase/functions/check-subscription`, `create-checkout`, `customer-portal`
- Mobile pass: `Dashboard.tsx`, `Agenda.tsx`, `Customers.tsx`, `Settings.tsx`, `Products.tsx`, `MobileDock.tsx`

## What you'll need to do after

1. Add `STRIPE_WEBHOOK_SECRET` (I'll prompt) — this is the webhook signing secret, NOT your secret API key.
2. In Stripe dashboard → Webhooks → add endpoint pointing to the new function URL, select the 3 events above.
3. In Stripe dashboard → Customer Portal → enable + copy the portal link, paste into one config var.
