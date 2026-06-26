# Walk-in Queue

Customers check in from their phone, consent to SMS, and get a live queue
position. Staff advance the queue; the lobby TV shows progress.

## Check-in flow

1. **Page** — `/check-in` ([app/check-in/page.tsx](../app/check-in/page.tsx))
   loads services, barbers, and shop settings. If
   `shop_settings.walk_in_checkin_open` is false, it shows
   *"Walk-in check-in is currently closed."* and no form.
2. **Form** — [check-in-form.tsx](../app/check-in/check-in-form.tsx) collects
   first/last name, optional email, optional preferred barber, service, and a
   **required SMS consent** checkbox.
3. **Join** — POSTs to `POST /api/check-in`
   ([app/api/check-in/route.ts](../app/api/check-in/route.ts)), which calls
   `join_walk_in_queue(...)`.
4. **Result** — On success the customer sees their queue position. If they are
   already in the active queue, the existing position is returned
   (`already_in_queue`).

## Rules

| Rule | Mechanism / error |
|------|-------------------|
| Check-in must be open | `WALK_IN_CLOSED` |
| SMS consent required to join | `CONSENT_REQUIRED` |
| Service must be active | `SERVICE_UNAVAILABLE` |
| No duplicate active entries | dedupe inside `join_walk_in_queue` (returns existing entry) |

## Queue statuses

`waiting` → `next` → `in_chair` → `completed`, with `canceled` and `no_show` as
terminal states. `recalc_queue_positions()` renumbers positions when entries
change.

## Staff actions

The queue board ([components/queue-board.tsx](../components/queue-board.tsx)) is
used by both admin (`/admin/queue`) and barbers (`/barber`). It reads via
`get_staff_queue()` and subscribes to realtime changes on `walk_in_queue`, with a
15-second polling fallback. Actions POST to `POST /api/queue`
([app/api/queue/route.ts](../app/api/queue/route.ts)):

- **Mark next / In chair / Complete / No-show** → `update_walk_in_status(...)`
- **Take next** → `take_next_customer(barber)`

When an entry is marked **next**, the API triggers the one queue-next SMS (see
[sms-notifications.md](./sms-notifications.md)).

## Role scoping

- **Admin** sees all queue entries (and customer phone numbers).
- **Barbers** see entries assigned to them plus "first available" (unassigned)
  entries, and can take the next one. They do not see other barbers' phone data.

This scoping is enforced inside the `SECURITY DEFINER` function `get_staff_queue()`
and by RLS. See [security.md](./security.md).
