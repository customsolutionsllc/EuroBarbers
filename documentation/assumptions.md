# Assumptions & Confirmed Decisions

Each entry records a decision or assumption, the date, the reasoning, and whether
it still needs product-owner confirmation.

## Confirmed product-owner decisions (2026-06-22)

These were explicitly confirmed and are **not** open assumptions.

| # | Decision | Reason |
|---|----------|--------|
| 1 | Refactor existing `staff`/`bookings` schema to the required names (`barbers`, `appointments`, dedicated `customers` with dedup, `check_ins`, `walk_in_queue`, `sms_logs`, `shop_settings`, `barber_availability`, `barber_time_off`). | Reports and the documentation model depend on the `customers` + `check_ins` design. |
| 2 | Twilio not connected yet; SMS code is built but the actual send is stubbed/feature-flagged. Resend email stays. | No Twilio credentials / A2P 10DLC registration yet. |
| 3 | Supabase Auth with individual accounts; each `barbers` row links to an auth user; an admin role flag grants admin access. | Real barber-level access and accountability. |
| 4 | Queue display protected by a secret token from the start: `/queue-display/[displayToken]`, token in `shop_settings` (admin-changeable). | TV must run without login but not be openly guessable; no private data shown. |
| 5 | No scheduled appointment reminders. SMS is event-based only: marking a walk-in "next" sends one queue-next SMS, logged and de-duplicated. Appointment reminders are out of scope unless the owner later requests them. | Owner wants queue-next only for launch; keep DB fields for future reminders. |
| 6 | Single physical location at 7370 Sawmill Road, Columbus, OH 43235. Dublin/Powell/Lewis Center/Hilliard/Marysville are SEO service areas only. | Owner confirmed one location. |
| 7 | "Elis" is the only confirmed barber; others are added through admin. | Owner provided one real name. |
| 8 | Use the requirements example service list with placeholder prices, editable in admin. | Owner has not finalized prices. |
| 9 | Customer email is optional everywhere; email confirmations send only when an email is provided. | Owner confirmed. |
| 10 | Walk-in confirmation shows queue position only — no wait-time estimate. | Owner confirmed. |
| 11 | Cancellations/reschedules are handled by phone + admin; online customer self-cancel is out of scope unless requested. | Owner confirmed. |
| 12 | Same-day booking allowed; a slot only shows if the full service fits inside the barber's working hours before closing. | Owner confirmed. |
| 13 | Admin can manually close walk-in check-in for the day; public page shows "Walk-in check-in is currently closed." | Owner confirmed. |
| 14 | Admin Settings has an `sms_enabled` on/off switch gating all outgoing SMS. | Owner confirmed. |
| 15 | Terms of Service, Privacy Policy, and an SMS/messaging policy page are required for launch. | Site collects PII + SMS consent. |
| 16 | Admin can export check-ins, customers, and reports to CSV. | Owner confirmed. |
| 17 | Admins see everything; barbers see only their own appointments/queue plus First Available customers. | Owner confirmed. |
| 18 | If a customer already has an active walk-in queue record for the current day (`waiting`/`next`/`in_chair`), do not create another — show their existing position. New check-in only if prior visit is completed/canceled/no-show or from another day. | Owner confirmed; prevents accidental double check-in. |

## Working assumptions (needs confirmation)

| Date | Assumption | Why | Needs confirmation? |
|------|------------|-----|---------------------|
| 2026-06-22 | Placeholder service prices and durations will be used until the owner provides real numbers. | Unblocks UI and seed data. | Yes — real prices/durations. |
| 2026-06-22 | Default business hours are 10 AM–7 PM, 7 days/week unless the owner specifies closed days. | Requirements list hours but not weekly closures. | Yes — weekly closed days. |
| 2026-06-22 | Barber working hours default to shop hours until set per barber in admin. | Reasonable default. | Yes — per-barber schedules. |
| 2026-06-22 | Reused Resend email confirmation is acceptable interim notification until Twilio is live. | Existing functionality. | No (can revisit). |
