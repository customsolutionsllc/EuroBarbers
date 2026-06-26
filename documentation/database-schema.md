# Database Schema

The schema lives in `supabase/migrations/` and is the **source of truth**. Apply
migrations in order (`0001` → `0005`). See [deployment.md](./deployment.md) for
how to apply them.

> **Note:** As of writing, migrations have not been applied to a live Supabase
> project from this environment (no CLI/Docker/Postgres available locally). They
> are validated by review and by the app's TypeScript build. See
> [open-questions.md](./open-questions.md).

## Tables

### `shop_settings` (singleton, `id = true`)
Global configuration. Key columns: `sms_enabled` (admin SMS master toggle),
`walk_in_checkin_open` (open/close walk-in check-in), `queue_display_token`
(token for the lobby TV URL), `timezone` (`America/New_York`),
`slot_interval_minutes`, `min_notice_minutes`, plus NAP fields.

### `services`
`id` (uuid), `slug`, `name`, `description`, `price_cents`, `duration_minutes`,
`buffer_after_minutes`, `is_active`, `sort_order`.

### `barbers`
`id` (uuid), `slug`, `name`, `title`, `bio`, `image_url`, `specialties[]`,
`auth_user_id`, `is_active`, `sort_order`.

### `barber_services`
Join table: which services each barber offers.

### `barber_availability`
Weekly recurring hours per barber (day of week + start/end time).

### `barber_time_off`
One-off blocks when a barber is unavailable.

### `customers`
`first_name`, `last_name`, `phone`, `email`, normalized variants, SMS consent
fields (`sms_transactional_consent[_at]`, `sms_marketing_consent[_at]`,
`sms_marketing_consent_source`, `sms_opted_out`), `last_seen_at`. A trigger
(`customers_set_normalized`) fills normalized columns; a unique constraint on the
normalized triple deduplicates customers.

### `appointments`
Scheduled bookings. A generated `time_range` column plus an **exclusion (GiST)
constraint** prevent overlapping appointments for the same barber across
`scheduled`/`confirmed`/`completed` statuses — this is what stops double-booking.

### `check_ins`
The reporting basis for walk-in visits; `served_by_barber_id` records who served
the customer.

### `walk_in_queue`
Live queue. `status` ∈ `waiting`/`next`/`in_chair`/`completed`/`canceled`/`no_show`;
`position`; `next_sms_sent` (dedupe flag for the queue-next SMS); `checked_in_at`;
`preferred_barber_id` (nullable = "first available").

### `sms_logs`
Every SMS attempt: `sms_type` (incl. `queue_next`), `status`
(`sent`/`stubbed`/`skipped`/`failed`), `provider_message_id`.

### `profiles`
`id` → `auth.users`, `role` (`admin`/`barber`), `barber_id`. Links a logged-in
user to their role and (for barbers) their barber record.

## Helper functions

- `is_admin()` — true if the current user's profile role is `admin`.
- `current_barber_id()` — the `barber_id` of the current user (for barber-scoped RLS).

## SQL functions (business logic)

| Function | Purpose |
|----------|---------|
| `get_available_slots(service, barber, date)` | Bookable start times for a service/barber/day |
| `upsert_customer(...)` | Find-or-create a customer with consent capture |
| `create_appointment(...)` | Validate + insert a booking; raises typed errors (e.g. `SLOT_TAKEN`, `TOO_SOON`) |
| `join_walk_in_queue(...)` | Add a walk-in; dedupes active entries; raises `WALK_IN_CLOSED`/`CONSENT_REQUIRED` |
| `update_walk_in_status(...)` | Advance/cancel a queue entry |
| `take_next_customer(barber)` | Assign the next waiting customer to a barber |
| `recalc_queue_positions()` | Renumber queue positions |
| `get_shop_public()` | Public, safe subset of `shop_settings` |
| `get_staff_queue()` / `get_lobby_queue(token)` / `get_staff_appointments(date)` | Role-scoped read views (see migration 0004) |
| `get_admin_reports(start, end)` | Aggregated metrics for the reports page (migration 0005) |

Access is enforced by RLS plus `SECURITY DEFINER` functions for views that need
controlled, role-scoped reads. See [security.md](./security.md).
