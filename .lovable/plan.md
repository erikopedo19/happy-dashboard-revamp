# Plan

## 1. Avatar upload on Settings
Add a round avatar uploader (reusing `BrandImageUpload`) to the Profile section of `Settings.tsx`. Saves to `profiles.avatar_url`.

## 2. Email redesign + cancel/reschedule
**DB migration:**
- Add `cancel_token uuid unique default gen_random_uuid()` to `appointments`
- RPC `cancel_appointment_by_token(token)` → sets status='cancelled'
- RPC `reschedule_appointment_by_token(token, new_date, new_time)`
- RPC `get_appointment_by_token(token)` → returns booking + business info for the page

**Public routes (no auth needed, token-gated):**
- `/manage/:token` — public page showing booking, with **Cancel** and **Reschedule** buttons. Reschedule reuses the existing time-slot picker.

**Email (`send-booking-confirmation`):**
- Sender: `booking@cutzioo.com` (name = business name)
- Modern dark-accent design, larger header, booking detail card, two CTA buttons (Cancel / Reschedule) pointing at `https://cutzioo.com/manage/{token}`
- Footer: small Cutzioo logo + "Sent by cutzioo.com" watermark
- Update SMS to include short manage link

> ⚠️ Until `cutzioo.com` is verified in Brevo, emails from `booking@cutzioo.com` may bounce or be rejected. You'll need to add the domain in Brevo → Senders & Domains and add the DNS records they give you. I'll wire the code; you complete verification when ready.

## 3. Push notifications (booking created / updated / cancelled)
**In-app (works immediately):**
- Supabase Realtime subscription on `appointments` filtered by `user_id`
- Toast + bell badge in dock when INSERT/UPDATE/DELETE arrives
- New `notifications` table to persist a feed (read/unread)

**Web push (browser, PWA — needs VAPID keys):**
- `push_subscriptions` table
- Service worker `public/sw.js` to receive push
- Settings toggle to enable browser push (asks permission, stores subscription)
- Edge function `send-push` triggered by DB trigger via pg_net or by client realtime hook
- I'll need you to provide **VAPID public/private keys** (I'll generate them or you can use `npx web-push generate-vapid-keys`). Stored as secrets `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`.

## 4. Mobile-responsive Settings
Refactor `Settings.tsx`:
- Replace cramped tab bar with a clean sectioned layout on mobile (vertical accordion / segmented sheets)
- Larger touch targets, simpler spacing, hide desktop-only chrome
- Keep existing tab UI on ≥md breakpoint

---

## Suggested order
I'll ship in two batches to avoid one giant commit:
- **Batch A (now):** avatar upload, email redesign + sender + watermark + cancel/reschedule (DB + public page + email links), mobile Settings polish, in-app realtime notifications
- **Batch B (after):** Web push (once VAPID keys are decided)

Approve and I'll start with Batch A.
