# Booking Logic

The booking API remains available, but the current `/book` page is a call/walk-in
landing page: online booking is not exposed there yet. The database remains the
final authority for requests to `create_appointment`.

## Flow

1. **Form** — `app/book/booking-form.tsx` is retained but not mounted by `/book`.
   When enabled, it receives active services and barbers.
2. **Pick service + barber** — The customer chooses a service and either a
   specific barber or "first available."
3. **Load slots** — The form calls `GET /api/availability`
   ([app/api/availability/route.ts](../app/api/availability/route.ts)), which
   runs `get_available_slots(service, barber, date)` and returns deduped, sorted
   ISO start times.
4. **Confirm** — The form POSTs to `POST /api/bookings`
   ([app/api/bookings/route.ts](../app/api/bookings/route.ts)). The body is
   validated with Zod (bounded first/last name, required phone, optional email,
   `startsAt`, consent flags and notes), after a 16 KiB JSON-body limit.
5. **Create** — The route calls `create_appointment(...)`, which:
   - creates a customer or reuses one without overwriting existing contact/consent,
   - re-checks the slot against working hours, notice window, and existing
     appointments, and
   - inserts the appointment, returning `{ id, service_name, barber_name,
     barber_slug, starts_at, ends_at, status }`.
6. **Confirmation email** — If an email was provided, a confirmation is sent via
   Resend ([lib/email.ts](../lib/email.ts)).

## Rules enforced in the database

| Rule | Mechanism / error |
|------|-------------------|
| Service must be active | `SERVICE_UNAVAILABLE` |
| Minimum notice (no last-minute) | `TOO_SOON` |
| Maximum configured date horizon | `TOO_FAR_AHEAD` (`shop_settings.max_days_ahead`) |
| Barber must offer the service / be working | `BARBER_UNAVAILABLE`, `BARBER_OFF`, `OUTSIDE_HOURS` |
| First-available must find someone | `NO_BARBER_AVAILABLE` |
| No double-booking | `SLOT_TAKEN` + GiST exclusion constraint on `appointments` |

The API maps these to friendly messages via a `FRIENDLY_ERRORS` map so the user
sees readable text instead of raw codes.

## Same-day booking

Same-day booking is allowed up to the working-hours cutoff, subject to the
minimum-notice window (`shop_settings.min_notice_minutes`). All time math uses
`America/New_York`.

Working-hour bounds use full date-specific timestamps, not time-of-day alone,
so a late-night start cannot wrap its end into the next day and pass validation.
Apply migration `0009` for these rules and the service-role-only RPC grants.

## Why this design

Because the slot check and insert happen inside one Postgres function guarded by
an exclusion constraint, two customers racing for the same slot cannot both
succeed — the second receives `SLOT_TAKEN`.
