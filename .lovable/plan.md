## Goal
Let each barber control whether their shop appears publicly on the discovery map/list. When public, show either a single-barber profile (avatar + banner + name) or a team profile (team banner/logo + list of stylists). Also fix mobile + desktop transitions so components and the dock don't flash/disappear between pages.

## 1. Database (migration)
- Add `is_public boolean default false` to `profiles` (single barber visibility flag).
- Add `banner_url text` to `teams` (already has `logo_url`); confirm and add if missing.
- Add `is_public boolean default false` to `teams`.
- Add public-read RLS policies:
  - `profiles`: `SELECT` to anon/public WHERE `is_public = true` (only safe columns via existing `list_public_profiles` RPC — extend it to filter by `is_public`).
  - `teams`: `SELECT` to anon/public WHERE `is_public = true`.
  - `stylists`: already has `is_public` — ensure team-public stylists are readable when their team is public.
- New RPC `list_public_shops()` returning unified rows: `{ kind: 'solo'|'team', id, name, avatar_url, banner_url, brand_color, latitude, longitude, rating, stylists[] }`.

## 2. Settings page (`src/pages/Settings.tsx`)
- New "Public Visibility" card:
  - Toggle "Show my shop publicly".
  - If user belongs to a team → toggle controls team `is_public` and shows team preview (logo/banner + stylist list).
  - If solo → toggle controls profile `is_public` and shows solo preview (avatar + banner).
- Banner upload (reuse `BrandImageUpload`) for both profile and team.
- Avatar/logo upload already exists — keep.

## 3. Discovery (`FindBarbershop.tsx`, `BarbershopMap.tsx`)
- Replace current public profile fetch with `list_public_shops()` RPC.
- Map pins + cards render solo or team variant. Team card lists stylist chips with avatars.
- Keep map watermark removed.

## 4. Page transitions (mobile + desktop)
- Current setup uses route swap with no shared layout → components unmount, dock flickers.
- Fix:
  - Ensure `MobileDock` / `ClientMobileDock` and `AppSidebar` live in a persistent layout outside the route swap (move into `__root` / App layout, not inside individual pages).
  - Wrap only the page content in a lightweight `PageTransition` (opacity-only, 150ms, no scale/translate that causes layout jump).
  - Remove duplicate route wrappers (`AnimatedRoutes` no longer used) and ensure `Outlet` mounts pages directly so the dock never re-renders.

## 5. Modern design polish
- Solo card: rounded-3xl, banner with avatar overlay, brand-color accent, rating chip.
- Team card: banner + logo + horizontal stylist avatars row with names/specialties.
- Identical layout on mobile (full-width stacked) and desktop (grid).

## Technical notes
- All public reads via `SECURITY DEFINER` RPCs to avoid widening RLS surface.
- No service-role key on client.
- Banner uploads go to existing `brand-images` bucket under `{userId}/banner-*` and `team/{teamId}/banner-*`.

## Out of scope
- Team creation flow changes.
- Auth/roles refactor.

Ready to implement on approval.