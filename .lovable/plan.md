# Fix website styles and multi-service bookings

Both monitoring findings are real. Each fix reaches more than one small spot, so here is the plan before I change anything.

## 1. Make the website style picker work again

**What's wrong:** The editor still offers Cinema, Editorial, Bold and Fresh and saves the choice. Since the recent redesign, though, every public website shows the same dark "street poster" look, so the choice does nothing.

**Fix:** Keep the new poster design, but give each style its own colors and type:
- **Cinema:** the current dark poster look with rose highlights. Existing sites that use it won't change.
- **Editorial:** a warm cream background, dark ink text, a rust highlight and a serif headline.
- **Bold:** black with lime highlights and heavy condensed headlines.
- **Fresh:** a clean white background, dark text, rose highlights and softer corners.

The editor's swatches will match what the public site shows, including Fresh, whose swatch currently shows blue while the site used rose. A barber's own brand color still overrides the highlight color, as it does today.

## 2. Book the full time and price for several services

**What's wrong:** Quick Book shows the combined length and price, but it only saves the first service. The calendar then blocks only that service's time, so another client can book the rest and cause a double booking. The saved price also leaves out the extra services.

**Fix:** Each appointment will store how long it actually lasts and its total price.
- A multi-service booking blocks its full combined length on the public booking link, Quick Book, rescheduling, the Agenda (including drag-to-move and swaps), and the server's overlap checks.
- The appointment saves the combined price, and the existing loyalty discount applies to that total.
- The services are still listed by name on the appointment.
- One-service bookings and all existing appointments work exactly as before.

## Checks

- An automated test: a 30 + 45 minute booking blocks 75 minutes, and a second booking inside that time is rejected.
- An automated test: the saved price equals the sum of the chosen services.
- Phone screenshots of all four website styles on a public site.
- Signed-in booking can't be tested from here, so the Agenda side will be checked against the code only.

## Technical details

- Website: add `data-theme` on `.street-site` and move its hard-coded colors and fonts into CSS variables, with one block per theme (`noir`, `editorial`, `mono`, `fresh`). Accent stays `brand_color` with the theme's own color as fallback.
- Bookings: add a nullable `appointments.duration_minutes` column. Add optional `p_service_ids uuid[]` to `create_public_booking`, which validates that every service belongs to the business and is still offered, then sums duration and price.
- Update `get_booked_slots`, `validate_appointment_availability`, `swap_or_move_appointment` and `reschedule_appointment_by_token` to use `COALESCE(a.duration_minutes, s.duration)`. Agenda and reschedule views read the same value.
- `QuickBookSheet` sends all selected service ids.
