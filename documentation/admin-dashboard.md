# Admin Dashboard

Admins sign in at `/login` and land in `/admin`. Every admin route is protected
by `middleware.ts` (redirects unauthenticated users to `/login`) and by
`requireAdmin()` in the admin layout ([app/admin/layout.tsx](../app/admin/layout.tsx)).
All admin routes render dynamically.

## Pages

| Page | Route | What it shows |
|------|-------|---------------|
| Dashboard | `/admin` | Live counts: today's bookings, customers in queue now, active barbers, active services |
| Calendar | `/admin/calendar` | FullCalendar resource view — one column per barber, all appointments |
| Bookings | `/admin/bookings` | Upcoming appointments table with a **cancel** action |
| Queue | `/admin/queue` | The live queue board (admin scope: all entries + phone numbers) |
| Staff | `/admin/staff` | All barbers from the database (active + inactive) with specialties |
| Services | `/admin/services` | All services from the database with price, duration, buffer, status |
| Reports | `/admin/reports` | Aggregated metrics + charts + CSV export (see [reports.md](./reports.md)) |
| Settings | `/admin/settings` | SMS on/off, walk-in open/close, lobby display URL |

## Settings (operational toggles)

[app/admin/settings/page.tsx](../app/admin/settings/page.tsx) updates
`shop_settings` via a server action:

- **SMS enabled** — master switch for queue-next SMS (`sms_enabled`).
- **Walk-in check-in open** — opens/closes `/check-in` (`walk_in_checkin_open`).
- **Lobby display URL** — shows the token-gated TV link built from
  `queue_display_token`.

## Calendar data

The calendar fetches `GET /api/admin/bookings`, which returns both `bookings`
(events) and `resources` (active barbers, keyed by slug) so columns always match
the real roster.

## Exports

`GET /api/admin/export?type=check_ins|customers` returns CSV for reporting and
record-keeping. Admin-only.
