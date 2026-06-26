# Barber Dashboard

Barbers sign in at `/login` and land in `/barber`. The route is protected by
`middleware.ts` and by `requireStaff()` in the barber layout
([app/barber/layout.tsx](../app/barber/layout.tsx)). If the signed-in user is an
admin, the layout also shows a link to the admin area.

## What a barber sees

- **Today's appointments** — loaded via `get_staff_appointments(date)`, scoped to
  the signed-in barber.
- **Live queue board** — the same [queue board](../components/queue-board.tsx) as
  admin, but scoped: the barber sees entries assigned to them plus "first
  available" (unassigned) entries.

## Actions

From the queue board the barber can:

- **Take next** — `take_next_customer(barber)` assigns the next eligible customer
  to them.
- **Mark next / In chair / Complete / No-show** — `update_walk_in_status(...)`.

Marking a customer **next** triggers the queue-next SMS (subject to the gates in
[sms-notifications.md](./sms-notifications.md)).

## Scope & privacy

- A barber cannot see other barbers' appointments.
- A barber does not see customer phone numbers (admin-only field in
  `get_staff_queue()`).
- Scoping is enforced inside `SECURITY DEFINER` functions and by RLS using
  `current_barber_id()` — not just in the UI. See [security.md](./security.md).
