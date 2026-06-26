# Booking Logic

Online appointment booking. The database is the final authority — the UI only
proposes times; `create_appointment` accepts or rejects them.

## Flow

1. **Page** — `/book` ([app/book/page.tsx](../app/book/page.tsx)) loads active
   services and barbers and renders the booking form (`force-dynamic`).
2. **Pick service + barber** — The customer chooses a service and either a
   specific barber or "first available."
3. **Load slots** — The form calls `GET /api/availability`
   ([app/api/availability/route.ts](../app/api/availability/route.ts)), which
   runs `get_available_slots(service, barber, date)` and returns deduped, sorted
   ISO start times.
4. **Confirm** — The form POSTs to `POST /api/bookings`
   ([app/api/bookings/route.ts](../app/api/bookings/route.ts)). The body is
   validated with Zod (first/last name, optional email/phone, `startsAt`, SMS
   consent flags, notes).
5. **Create** — The route calls `create_appointment(...)`, which:
   - upserts the customer (capturing consent),
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
| Barber must offer the service / be working | `BARBER_UNAVAILABLE`, `BARBER_OFF`, `OUTSIDE_HOURS` |
| First-available must find someone | `NO_BARBER_AVAILABLE` |
| No double-booking | `SLOT_TAKEN` + GiST exclusion constraint on `appointments` |

The API maps these to friendly messages via a `FRIENDLY_ERRORS` map so the user
sees readable text instead of raw codes.

## Same-day booking

Same-day booking is allowed up to the working-hours cutoff, subject to the
minimum-notice window (`shop_settings.min_notice_minutes`). All time math uses
`America/New_York`.

## Why this design

Because the slot check and insert happen inside one Postgres function guarded by
an exclusion constraint, two customers racing for the same slot cannot both
succeed — the second receives `SLOT_TAKEN`.
