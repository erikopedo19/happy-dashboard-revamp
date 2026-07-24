## 1. Booking email — more details

Update `supabase/functions/send-booking-confirmation/index.ts`:
- Add stylist row (name + small avatar circle) when `stylist_id` is set on the appointment.
- Add address block with a "Open in Maps" link (`https://www.google.com/maps/search/?api=1&query=...`).
- Add a clear breakdown card: Service · Duration (min) · Price.
- Attach a generated `.ics` file (VEVENT with SUMMARY, LOCATION, DESCRIPTION, DTSTART/DTEND in the business timezone) so Apple/Google/Outlook can add to calendar in one tap. Also add a fallback "Add to Google Calendar" text link.
- Keep the existing dark Reschedule / outlined Cancel buttons and minimal layout — just add the new rows above them.

DB: `get_appointment_by_token` already returns stylist? No — extend the payload the trigger sends so the function has `stylistName`, `stylistAvatar`, `address`, `latitude/longitude`, `durationMinutes`. Update `trigger_send_booking_email` to include those fields.

## 2. Agenda — past days are view-only

In `AgendaBookingForm.tsx`, `AppointmentForm.tsx`, and the mobile `LiquidGlassAgenda.tsx`:
- Disable the "New booking" / "+" action when the selected date < today (business timezone).
- Show a subtle banner: "Past day — view only. You can see appointments but can't add or edit them."
- Disable edit/cancel actions on past appointments.
- Keep DB trigger as-is (walk-in past bookings blocked by validation when `auth.uid()` is not the owner; owner path already allowed — we're just hiding UI so barbers don't book historically per user preference).

## 3. Stories on Find Barber

### Storage
- New private bucket `stories` (20 MB per file, images/videos).
- RLS: owner (barber) can insert/update/delete their own folder `stories/{user_id}/*`. Everyone can read (public URL served through signed policy on `SELECT`).

### DB
```sql
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  music_track_id text,
  music_title text,
  music_artist text,
  music_preview_url text,
  duration_seconds int default 5,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '10 days'
);
-- grants + RLS: barbers manage their own; anyone can select non-expired
```
Cron job (`pg_cron`) daily: delete rows where `expires_at < now()` and remove their storage objects via an edge function `cleanup-expired-stories`.

### Spotify integration
- Add secrets `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` (Client Credentials flow — no user OAuth needed for search + 30s previews).
- New edge function `spotify-search` (public): takes `q`, returns list of `{id, title, artist, preview_url, artwork}`. Uses client-credentials token cached in memory.
- Trending: preload a curated playlist (Spotify's Top 50 - Global, id `37i9dQZEVXbMDoHDwVN2tF`) via `spotify-trending` when the picker opens with no query.

### UI
- `src/components/stories/StoryUploader.tsx`: file input (image/video, ≤20MB client check + toast), preview, "Pick a song" opens `SpotifyMusicPicker.tsx` with search + trending list, "Publish".
- `src/components/stories/StoriesRail.tsx` on `FindBarber` above the barbers list: horizontal avatars with gradient ring for barbers with active stories.
- `src/components/stories/StoryViewer.tsx`: full-screen modal, auto-advance ~5s per story, plays music preview in background (muted by default with tap-to-unmute per iOS autoplay rules), swipe/tap navigation, close X.
- Everyone can view (no login required); only barbers see the "+ Add story" tile (own row).

## Technical

- New files: `supabase/functions/spotify-search/index.ts`, `supabase/functions/cleanup-expired-stories/index.ts`, `src/components/stories/*`.
- Modified: `supabase/functions/send-booking-confirmation/index.ts`, DB trigger `trigger_send_booking_email`, agenda components, `src/pages/FindBarber.tsx`.
- Secrets needed from user: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` (free — https://developer.spotify.com/dashboard).
- Bucket `stories` created via `supabase--storage_create_bucket` (public read for simplicity so viewer can stream without signed URLs).

I'll request the Spotify secrets before wiring the music picker — everything else I can build immediately.