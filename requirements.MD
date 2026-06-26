# EuroBarbers — Product & Engineering Requirements

> Source of truth for building the EuroBarbers website + booking + walk-in queue
> system. Build it like a real, production-ready small-business application — not
> a demo. **Data security is mandatory.**
>
> Before implementing each major phase, re-read the relevant section here and the
> Documentation Rules. If anything is unclear, ask a **product-owner question**
> instead of guessing. Record every assumption in
> `/documentation/assumptions.md` and every open question in
> `/documentation/open-questions.md`.

---

## Table of Contents

1. [Locked Product Decisions](#1-locked-product-decisions)
2. [Project Goal](#2-project-goal)
3. [Tech Stack](#3-tech-stack)
4. [AI Build Rules](#4-ai-build-rules)
5. [Business Facts](#5-business-facts)
6. [User Roles](#6-user-roles)
7. [Public Website Pages](#7-public-website-pages)
8. [Booking Flow & Logic](#8-booking-flow--logic)
9. [Walk-In Check-In & Customer Deduplication](#9-walk-in-check-in--customer-deduplication)
10. [Queue System & Logic](#10-queue-system--logic)
11. [Live Lobby Queue Display](#11-live-lobby-queue-display)
12. [Admin Dashboard](#12-admin-dashboard)
13. [Barber Dashboard](#13-barber-dashboard)
14. [SMS Notifications (Twilio)](#14-sms-notifications-twilio)
15. [Database Schema](#15-database-schema)
16. [Reports](#16-reports)
17. [Design](#17-design)
18. [SEO](#18-seo)
19. [Security](#19-security)
20. [Environment Variables](#20-environment-variables)
21. [API Routes / Server Actions](#21-api-routes--server-actions)
22. [Documentation Requirements](#22-documentation-requirements)
23. [Code Quality & Folder Structure](#23-code-quality--folder-structure)
24. [Build Phases](#24-build-phases)
25. [Acceptance Criteria](#25-acceptance-criteria)

---

## 1. Locked Product Decisions

These were confirmed by the product owner on **2026-06-22** and override any
conflicting text elsewhere in this document.

| # | Topic | Decision |
|---|-------|----------|
| 1 | **Schema naming** | Refactor the existing `staff`/`bookings` schema to match these requirements: `barbers`, `appointments`, a dedicated `customers` table (with deduplication), `check_ins`, `walk_in_queue`, `sms_logs`, `shop_settings`, `barber_availability`, `barber_time_off`. Write migrations and update existing code accordingly. |
| 2 | **Twilio SMS** | No Twilio credentials yet. Build all SMS code now but **stub / feature-flag** the actual send so it is safely disabled until credentials exist. Keep the existing Resend email confirmation. |
| 3 | **Auth** | Use Supabase Auth. **Individual accounts**: each `barbers` row links to an auth user; an admin **role flag** grants admin access. Protect `/admin` and `/barber`. |
| 4 | **Queue display protection** | Protect the TV lobby screen with a **secret display token from the start**. Route: `/queue-display/[displayToken]`. Token stored in `shop_settings` (admin-changeable) and/or env. No admin login required for the TV, but the screen must only load with a valid token and must **never** show phone numbers, emails, or full last names. |
| 5 | **SMS scope** | The only SMS required for launch is the event-based walk-in queue **"you are next"** text: when a customer is marked **next**, immediately send one transactional SMS, log it in `sms_logs`, and mark the queue record to prevent duplicates. Scheduled 24h/2h appointment reminders are **out of scope** unless the owner later requests them. Keep DB fields flexible for future reminders; build no cron. |
| 6 | **Location** | **Single physical location**: 7370 Sawmill Road, Columbus, OH 43235 · 614-900-6080 · 10 AM–7 PM. Dublin, Powell, Lewis Center, Hilliard, and Marysville are **SEO service areas only**. |
| 7 | **Barber roster** | **Elis** is the only confirmed barber. Additional barbers are added through the admin dashboard; placeholders are used until then. |
| 8 | **Services & pricing** | Use the requirements example service list with **placeholder prices**, fully editable in admin. |
| 9 | **Email** | Customer email is **optional everywhere** (booking and check-in). Email confirmations are sent only when the customer provides an email. |
| 10 | **Walk-in wait estimate** | Show **queue position only** — no estimated wait time. |
| 11 | **Cancellations & reschedules** | Customers cancel/reschedule by **calling the shop**; admins can cancel/reschedule any appointment. Online customer self-cancellation is **out of scope** unless requested. |
| 12 | **Booking hours & cutoff** | Same-day booking is allowed. **Do not show a time slot unless the full service duration fits inside the barber's working hours** (before closing). |
| 13 | **Walk-in queue closing** | Admin can **manually close walk-in check-in** for the day. When closed, the public check-in page shows **"Walk-in check-in is currently closed."** |
| 14 | **Texting on/off control** | Admin Settings includes an **`sms_enabled` on/off** switch in `shop_settings` that gates all outgoing SMS (in addition to the Twilio feature flag). |
| 15 | **Legal pages** | **Terms of Service**, **Privacy Policy**, and an **SMS/messaging policy** page are required for launch (the site collects names, phone numbers, emails, and SMS consent). |
| 16 | **Report exports** | Admin can **export** check-ins, customers, and reports to **CSV**. |
| 17 | **Role separation** | **Admin sees everything.** A **barber sees only their own appointments and queue, plus First Available customers.** |
| 18 | **Active queue duplicate prevention** | If the same customer already has an active `walk_in_queue` record for the current day (status `waiting`, `next`, or `in_chair`), do **not** create another active queue entry — return/show their existing queue position. Create a new check-in only if the previous visit is `completed`, `canceled`, `no_show`, or from a different day. |

### "Next in queue" SMS copy (locked)

> EuroBarbers: You are next in queue. Your barber should be ready in about 10–20
> minutes. Please be nearby.

---

## 2. Project Goal

Build a premium, luxury barbershop website for EuroBarbers with:

- Luxury public website (fast, mobile-first, local-SEO optimized)
- Online appointment booking with barber selection and availability
- Walk-in check-in with a live lobby queue screen
- Admin dashboard and barber dashboard
- Event-based SMS queue notifications (Twilio, stubbed until creds)
- Customer deduplication and check-in history
- Business reports
- Full documentation

The site should feel high-end, modern, masculine, and European.

---

## 3. Tech Stack

| Tool | Used for |
|------|----------|
| Next.js | App framework (App Router) |
| TypeScript (strict) | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | UI component primitives |
| Framer Motion | Subtle premium animations |
| Supabase | Postgres DB, Auth, Realtime, Storage |
| Twilio | SMS (server-side only; stubbed until creds) |
| Resend | Email booking confirmation (existing) |
| Recharts | Report charts |
| Vercel | Hosting/deployment |

Do **not** use WordPress. Do **not** ship fake local-only data as the final
implementation. Temporary mock data is allowed only during early UI scaffolding
and must be clearly marked and replaced with Supabase-backed data.

---

## 4. AI Build Rules

### Do not hallucinate
Do not invent unclear requirements. If something is missing, ask a direct
product-owner question before implementing. If a decision must be made and no
answer is available, choose the safest small-business production option and
document the assumption in `/documentation/assumptions.md`.

### Build in small safe phases
Do not build the whole app in one giant step. Follow [Build Phases](#24-build-phases).
After each phase, summarize: what was built, which files changed, what remains,
and any assumptions made.

### Protect secrets
Never expose private keys in frontend code. Never expose
`SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_AUTH_TOKEN`, or any server-only secret.
Only expose `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`NEXT_PUBLIC_SITE_URL`. All SMS sending happens **server-side only**.

### Database first
Design around the real database structure, not just UI screens. Use migrations
or clear SQL setup files.

### Ask questions when needed
Format: "Question for product owner: [specific question]". No broad/vague
questions.

---

## 5. Business Facts

- **Shop name:** EuroBarbers
- **Address:** 7370 Sawmill Road, Columbus, OH 43235 (single location)
- **Phone:** 614-900-6080
- **Website:** www.EuroBarbers.com
- **Hours:** 10 AM – 7 PM
- **Timezone:** America/New_York
- **SEO service areas:** Columbus, Dublin, Powell, Lewis Center, Hilliard, Marysville
- **Real barber:** Elis (others are placeholders until admin update)

---

## 6. User Roles

### Customer
View the website, services/prices, and barbers; book an appointment (choose
barber, service, date, time); enter name, phone, optional email; join the
walk-in queue; receive SMS queue notifications.

### Barber
View today's appointments and own schedule; mark appointments completed /
no-show; take the next walk-in customer; set themselves available/unavailable.

### Admin
Manage services, barbers, barber availability, days off, appointments, and the
walk-in queue; view all appointments; cancel/reschedule; send manual SMS if
needed; open the live lobby queue screen; view reports; manage settings.

---

## 7. Public Website Pages

### Homepage (luxury)
Sections: hero with headline, subheadline, **Book Appointment** (primary CTA)
and **Join Walk-In Queue** (secondary CTA); services preview; featured barbers;
gallery preview; "Why Choose EuroBarbers"; reviews/testimonials; location/contact;
footer.

- Headline: "European precision. Modern style. Premium grooming."
- Subheadline: "EuroBarbers delivers sharp cuts, clean fades, beard grooming, and premium barbering in the Columbus area."

### Services page
Each service: name, description, price, duration (min), **Book** button.

Example services (placeholder prices, editable in admin):
Men's Haircut · Skin Fade · Beard Trim · Haircut + Beard · Kids Haircut ·
Hot Towel Shave · Lineup.

### Barbers page
Each barber: name, profile image, short bio, specialties, **Book with this
barber** button.

### Gallery page
Premium images (Supabase Storage or placeholders): before/after, shop interior,
haircut/fade examples.

### Booking page
See [Booking Flow & Logic](#8-booking-flow--logic).

### Walk-In Check-In page
See [Walk-In Check-In](#9-walk-in-check-in--customer-deduplication).

### Contact page
Shop name, address, website, phone, business hours, Google Maps embed, contact
form (Name, Last Name, Phone, Email — all required), local-SEO content for the
service areas.

### Legal pages (required for launch)
Because the site collects names, phone numbers, emails, and SMS consent, include:
- **Terms of Service**
- **Privacy Policy**
- **SMS / Messaging Policy** (covers transactional vs promotional consent and
  STOP opt-out)

Link these from the footer.

---

## 8. Booking Flow & Logic

### Flow
1. Select service
2. Select barber (**required before time selection**)
3. Select date
4. Show only available time slots **for the selected barber**
5. Select time
6. Enter customer info (first name, last name, phone, optional email, SMS consent)
7. Confirm appointment → confirmation screen

SMS consent text:
> "By booking, you agree to receive appointment reminder texts from EuroBarbers.
> Message and data rates may apply. Reply STOP to opt out."

### Availability calculation
Compute slots from: selected barber, service duration, barber weekly
availability, barber time off, existing appointments, and appointment status.
Do **not** count canceled appointments as blocking. Generate slots in
**15-minute increments**, only showing slots that fit the full service duration.

### Booking hours & cutoff
Same-day booking is allowed. **Do not show a time slot unless the full service
duration fits inside the barber's working hours** before closing — for example, a
30-minute service must not be offered 15 minutes before close. Respect the shop's
`min_notice_minutes` lead time so customers cannot book a time that has already
effectively passed.

### Cancellations & reschedules
Customers cancel or reschedule by **calling the shop**. Online customer
self-cancellation is **out of scope** unless requested. Admins can cancel or
reschedule any appointment from the admin dashboard; canceled appointments stop
blocking the barber's availability.

### Overlap / double-booking rule
An appointment overlaps if:
```
new_start < existing_end AND new_end > existing_start
```
Booking must respect barber working hours and days off, prevent double booking,
store `barber_id`, and allow admins to reassign the appointment afterward.

---

## 9. Walk-In Check-In & Customer Deduplication

### Form fields
- First name — **required**
- Last name — **required**
- Phone number — **required** (validated)
- Email — optional (never blocks check-in)
- Service requested — **required**
- Preferred barber — **required** (a specific barber **or** "First Available")
- Transactional SMS consent — **required**
- Promotional SMS consent — **optional**

### Two separate consent checkboxes
1. **Appointment & Queue Notifications (required):**
   > "I agree to receive text messages from EuroBarbers about my check-in, queue
   > position, and appointment updates. Message and data rates may apply. Reply
   > STOP to opt out."
2. **Future Offers & Promotions (optional, unchecked by default):**
   > "I agree to receive promotional text messages from EuroBarbers about future
   > offers, discounts, and updates. Message and data rates may apply. Reply STOP
   > to opt out."

Store the promotional answer, its opt-in timestamp, and the source
(`walk_in_check_in` or `booking_page`). Never require promotional consent.

### Customer deduplication
A customer is the **same** customer only if all three normalized fields match:
`normalized_first_name`, `normalized_last_name`, `normalized_phone`.

- Same phone + different name = **different** customer (lets a parent check in
  children on one phone).
- "John Smith" + 614… = "Johnny Smith" + 614… → different.

**Normalization:** trim spaces; lowercase first/last name for matching; strip
spaces, dashes, parentheses, and symbols from phone. Store original display
values; use normalized values only for matching. Enforce a unique constraint on
`(normalized_first_name, normalized_last_name, normalized_phone)`.

### Check-in procedure
1. Normalize first name, last name, phone.
2. Find existing customer by the three normalized fields.
3. If found: update email, consent values, and `last_seen_at`.
4. If not found: create a new customer.
5. **Active-queue duplicate check:** if this customer already has a
   `walk_in_queue` record for the current day with status `waiting`, `next`, or
   `in_chair`, do **not** create a new check-in or queue entry — return their
   existing queue position. Only continue if no such active record exists (i.e.,
   the previous visit is `completed`, `canceled`, `no_show`, or from another day).
6. Create a new `check_ins` row for this visit.
7. Create a new `walk_in_queue` row linked to the customer and check-in.
8. Show the customer their queue position.

### Customers vs check_ins vs walk_in_queue
- `customers` = one record per unique person.
- `check_ins` = one record per visit (the basis for reporting).
- `walk_in_queue` = current active queue state only.

After check-in, show a success message and the customer's queue position (place
in line only — no estimated wait time).

### Walk-in check-in open/close
Admins can **manually close walk-in check-in** for the day (a flag in
`shop_settings`). While closed, the public check-in page must not accept
submissions and instead shows: **"Walk-in check-in is currently closed."**

---

## 10. Queue System & Logic

### Joining the queue
Add the customer at the end of the waiting queue with an auto-assigned position.
A specific-barber choice joins that barber's queue (`preferred_barber_id` set);
"First Available" joins the general queue (`preferred_barber_id = null`). Queue
updates live via Supabase Realtime.

### Queue statuses
`waiting`, `next`, `in_chair`, `completed`, `canceled`, `no_show`.

### "Take Next Customer" logic
1. Find the earliest waiting customer assigned to that barber.
2. If none, find the earliest waiting "First Available" customer (`barber_id`
   null).
3. Never auto-take a customer assigned to another barber.
4. Set status to `next` or `in_chair`; set `served_by_barber_id`.
5. Update `called_at` / `started_at` / `completed_at` as appropriate.
6. Recalculate queue positions; lobby and admin screens update live.

### Preferred vs served barber
- `preferred_barber_id` = what the customer requested (null for First Available).
- `served_by_barber_id` = who actually served them (set when serving starts).

### Admin queue controls
View by all / First Available / specific barber / status / service. Reassign a
customer to another barber, switch between specific barber and First Available,
and manually change queue position.

---

## 11. Live Lobby Queue Display

Route: `/queue-display/[displayToken]` (token from `shop_settings`/env;
admin-changeable). No admin login; must load only with a valid token.

- Full-screen, large text, premium dark luxury design.
- Auto-refresh via Supabase Realtime.
- Show currently serving customers and the next-up list, each with preferred
  barber or "First Available".
- **Never** show full phone numbers, full last names, or emails. Show first name
  + last initial only.

Example:
```
Currently Serving:
  Elis is serving John D.
  Marco is serving Mike R.

Next Up:
  1. Adrian K. — Elis
  2. Brian M. — First Available
  3. Chris T. — Marco
```

---

## 12. Admin Dashboard

Route `/admin`, Supabase Auth required (admin role).

### Pages
1. **Overview** — today's appointments, current queue, counts, next customer,
   quick actions.
2. **Appointments** — view by date; filter by barber/status; create/edit/cancel/
   reschedule; mark completed/no-show. Statuses: `scheduled`, `confirmed`,
   `completed`, `canceled`, `no_show`.
3. **Queue management** — live queue; add walk-in manually; change order; assign
   barber; mark next / in chair / completed / canceled / no-show; send "you are
   next" SMS.
4. **Barbers** — add/edit/deactivate; upload profile image; specialties; working
   hours; days off; active flag.
5. **Services** — add/edit/deactivate; price; duration; description.
6. **Settings** — shop name, address, phone, business hours; **SMS Enabled
   on/off** (`sms_enabled`) gating all outgoing texts; **walk-in check-in
   open/close** for the day; reminder settings; queue display settings (incl.
   display token).
7. **Reports** — see [Reports](#16-reports); includes **CSV export** of
   check-ins, customers, and report data.

### Role separation
**Admins see everything.** Admin-only access is enforced via the admin role.

---

## 13. Barber Dashboard

Route `/barber`, Supabase Auth required (barber account).

A barber can: view their own appointments and queue; mark customer in chair;
mark appointment completed or no-show; take next customer; set availability
status. The dashboard shows customers assigned to that barber **and** First
Available customers that barber can take.

### Role separation
A **barber sees only their own appointments and queue, plus First Available
customers** — never another barber's assigned customers or shop-wide data.
Enforce this in queries and with Row Level Security.

---

## 14. SMS Notifications (Twilio)

> **Build now, send disabled.** All Twilio code is written but the actual send is
> stubbed/feature-flagged until credentials and A2P 10DLC registration exist.

### Required SMS for launch (event-based only)
When a walk-in customer is marked **next**, immediately send **one**
transactional SMS, store it in `sms_logs`, and mark the queue record so the same
"next" SMS is not sent twice. Message:
> "EuroBarbers: You are next in queue. Your barber should be ready in about 10–20
> minutes. Please be nearby."

### SMS rules
- Server-side only; never from the client.
- Gated by **both** the Twilio feature flag and the admin `sms_enabled` setting;
  if either is off, no SMS is sent.
- Store every SMS in `sms_logs` (phone, message, type, provider, provider message
  id, status, `sent_at`).
- No duplicate sends.
- Respect transactional vs promotional consent and STOP opt-outs.

### Out of scope (keep DB flexible)
Booking confirmation SMS; 24h and 2h appointment reminders; "almost ready" SMS
are **out of scope unless the owner later requests them**. Still support these
`sms_logs.sms_type` values for the future: `booking_confirmation`, `reminder_24h`,
`reminder_2h`, `queue_next`, `queue_almost_ready`, `manual`.

---

## 15. Database Schema

Use Supabase Postgres. Migrations live in `/supabase/migrations`. The existing
`staff`/`bookings` schema is refactored to the names below (decision #1).

### customers
| Field | Type / notes |
|-------|--------------|
| id | uuid pk |
| first_name | text not null (display) |
| last_name | text not null (display) |
| phone | text not null (display) |
| email | text nullable |
| normalized_first_name | text not null |
| normalized_last_name | text not null |
| normalized_phone | text not null |
| sms_transactional_consent | boolean default false |
| sms_transactional_consent_at | timestamptz nullable |
| sms_marketing_consent | boolean default false |
| sms_marketing_consent_at | timestamptz nullable |
| sms_marketing_consent_source | text nullable |
| sms_opted_out | boolean default false |
| last_seen_at | timestamptz nullable |
| created_at / updated_at | timestamptz |

Unique constraint: `(normalized_first_name, normalized_last_name, normalized_phone)`.

### barbers
`id uuid pk`, `name text not null`, `slug text unique not null`, `bio text`,
`image_url text`, `specialties text[]`, `auth_user_id uuid` (links to Supabase
auth user), `is_active boolean default true`, `created_at`, `updated_at`.

### services
`id uuid pk`, `name text not null`, `slug text unique not null`, `description text`,
`price_cents integer not null`, `duration_minutes integer not null`,
`is_active boolean default true`, `created_at`, `updated_at`.

### appointments
`id uuid pk`, `customer_id → customers`, `barber_id → barbers`,
`service_id → services`, `appointment_start timestamptz not null`,
`appointment_end timestamptz not null`,
`status text not null default 'scheduled'`, `notes text`,
`reminder_24h_sent boolean default false`, `reminder_2h_sent boolean default false`,
`confirmation_sms_sent boolean default false`, `created_at`, `updated_at`.
Status values: `scheduled`, `confirmed`, `completed`, `canceled`, `no_show`.

### barber_availability
`id uuid pk`, `barber_id → barbers`, `day_of_week integer not null`
(0=Sun … 6=Sat), `start_time time not null`, `end_time time not null`,
`is_available boolean default true`, `created_at`, `updated_at`.

### barber_time_off
`id uuid pk`, `barber_id → barbers`, `start_datetime timestamptz not null`,
`end_datetime timestamptz not null`, `reason text`, `created_at`, `updated_at`.

### check_ins
`id uuid pk`, `customer_id → customers`, `barber_id → barbers nullable`,
`service_id → services`, `check_in_type text not null default 'walk_in'`
(`walk_in`/`appointment`/`manual_admin`), `status text not null default 'waiting'`,
`checked_in_at timestamptz not null`, `completed_at`, `canceled_at`, `no_show_at`,
`estimated_wait_minutes integer nullable`,
`queue_position_at_checkin integer nullable`,
`preferred_barber_id → barbers nullable`, `served_by_barber_id → barbers nullable`,
`created_at`, `updated_at`. Status values match the queue statuses.

### walk_in_queue
`id uuid pk`, `customer_id → customers`, `check_in_id → check_ins`,
`service_id → services`, `barber_id → barbers nullable`,
`preferred_barber_id → barbers nullable`, `served_by_barber_id → barbers nullable`,
`position integer not null`, `status text not null default 'waiting'`,
`checked_in_at`, `called_at`, `started_at`, `completed_at`,
`next_sms_sent boolean default false`, `created_at`, `updated_at`.
Status values: `waiting`, `next`, `in_chair`, `completed`, `canceled`, `no_show`.

### sms_logs
`id uuid pk`, `customer_id → customers`, `appointment_id → appointments nullable`,
`queue_id → walk_in_queue nullable`, `phone text not null`, `message text not null`,
`sms_type text not null`, `provider text default 'twilio'`,
`provider_message_id text nullable`, `status text nullable`,
`sent_at timestamptz nullable`, `created_at`.

### shop_settings
`id uuid pk`, `shop_name text default 'EuroBarbers'`, `phone`, `address`, `city`,
`state`, `zip`, `timezone text default 'America/New_York'`,
`sms_enabled boolean default false` (master on/off gating all outgoing SMS),
`walk_in_checkin_open boolean default true` (admin closes walk-in check-in for
the day), `reminder_24h_enabled boolean default true`,
`reminder_2h_enabled boolean default true`,
`queue_sms_enabled boolean default true`,
`queue_display_token text` (admin-changeable), `created_at`, `updated_at`.

---

## 16. Reports

Route `/admin/reports` (admin login). **Reports use `check_ins` (+ appointments
and walk_in_queue) data, not the `customers` table**, because `customers` holds
unique people while `check_ins` holds every visit.

### Filters
Date range, barber, service, status, walk-ins only, appointments only.
Default ranges: Today, Yesterday, Last 7 days, Last 30 days, This month, Custom.

### Required reports
1. **Daily** — total check-ins, completed, canceled, no-shows, average wait,
   busiest hour, most requested barber, most requested service.
2. **Weekly** — total, average/day, busiest day, slowest day, completed,
   no-shows, canceled.
3. **Barber** — assigned check-ins, appointments, completed, no-shows, average
   wait, busiest day, busiest hour, First Available counts, who actually served
   First Available (`served_by_barber_id`).
4. **Service** — times requested, % of total, most/least popular.
5. **Customer return** — total unique, new, returning, >1 visit, marketing
   opt-ins, opt-outs.

### Charts (Recharts)
Check-ins by day, by hour, by barber, by service; appointments vs walk-ins.

### CSV export
Admins can export check-ins, customers, and any report's data to **CSV** for the
currently applied filters.

---

## 17. Design

Luxury, European, masculine, clean, premium, modern. Suggested palette:
near-black background, charcoal secondary, gold/bronze accent, white/off-white
text, gray muted text, gold/bronze buttons with dark text (or dark with gold
border). Use large hero typography, smooth animations, premium cards,
high-quality image placeholders, strong spacing, mobile-first responsive design.
Avoid cheap template looks, too many colors, clutter, cartoon icons, generic
stock design.

---

## 18. SEO

Optimize for: EuroBarbers, EuroBarbers Ohio, Barbershop Columbus/Dublin/Powell/
Lewis Center Ohio, Men's haircut / Fade haircut / Beard trim Columbus Ohio.
Include: SEO title + meta description per public page; LocalBusiness and
BarberShop schema; Open Graph metadata; sitemap; robots.txt; fast loading;
mobile-friendly layout; proper heading hierarchy; location-specific content
sections.

---

## 19. Security

- Supabase Auth for admin and barber dashboards; admin-only and barber-only
  access enforced.
- Use Row Level Security where appropriate.
- Never expose service role keys or Twilio tokens in the frontend.
- Validate all form inputs; validate phone numbers.
- Protect `/admin` and `/barber` routes.
- Send SMS server-side only (API routes / server actions).
- Queue display gated by display token; no private data shown.

---

## 20. Environment Variables

**Public:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SITE_URL`.

**Private (server only):** `SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `RESEND_API_KEY` (existing email).

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `TWILIO_AUTH_TOKEN`.

---

## 21. API Routes / Server Actions

Server-side logic for: create appointment; get available time slots; join
walk-in queue; update queue status; send SMS (stubbed); admin appointment
updates; admin queue updates. (Appointment reminder jobs are **not** built now.)

---

## 22. Documentation Requirements

Create a `/documentation` folder at the project root with these files:

- `README.md` — purpose of the folder and an index of all docs.
- `project-overview.md` — what EuroBarbers is, what the system does, features,
  roles, high-level architecture.
- `tech-stack.md` — each tool and what it's used for.
- `environment-variables.md` — all env vars, which are public vs private.
- `database-schema.md` — every table, field, relationship, and rule.
- `booking-logic.md` — booking flow, barber selection, duration, availability,
  time off, existing appointments, double-booking prevention, slot generation,
  the overlap rule.
- `walk-in-queue.md` — check-in flow, dedup, preferred vs First Available, status
  changes, position recalculation, lobby display, admin controls.
- `sms-notifications.md` — Twilio usage, the event-based queue-next SMS, sms_logs,
  transactional vs promotional consent, STOP handling, and the deferred reminder
  plan.
- `admin-dashboard.md` — admin features.
- `barber-dashboard.md` — barber features.
- `reports.md` — each report, filters, data sources.
- `security.md` — Auth, RLS, protected routes, secret handling, server-side SMS,
  role-based access.
- `deployment.md` — Vercel deploy, Supabase connection, env config, Twilio setup,
  production testing.
- `assumptions.md` — every assumption (date, assumption, why, needs confirmation?).
- `open-questions.md` — every open question (question, why it matters, impact,
  status).

---

## 23. Code Quality & Folder Structure

Use strict TypeScript and clear file names. Keep components small and reusable.
Separate UI components, database logic, server actions, utilities, validation,
and types. Validate all forms. Prefer readable over clever code. Comment only
non-obvious logic. No unused files, dead code, or broken placeholder routes.

Suggested structure:
```text
/app
  /(public)
  /admin
  /barber
  /booking
  /check-in
  /queue-display
/components
  /ui /layout /booking /queue /admin /barber /reports
/lib
  /supabase /twilio /booking /queue /reports /validation
/types
/supabase
  /migrations
/documentation
```

---

## 24. Build Phases

Build in this order; summarize after each phase.

1. Project setup *(largely done — verify)*
2. Documentation folder
3. Database schema (refactor + new tables, migrations)
4. Supabase client setup (anon + server + auth)
5. Public website pages + legal pages (Terms, Privacy, SMS policy)
6. Booking flow (same-day + working-hours cutoff; admin cancel/reschedule)
7. Walk-in check-in (admin open/close control)
8. Admin dashboard (incl. `sms_enabled` toggle and walk-in open/close)
9. Barber dashboard (role-scoped)
10. Live queue display
11. SMS integration (stubbed, gated by Twilio flag + `sms_enabled`)
12. Reports (with CSV export)
13. SEO
14. Testing and polish
15. Deployment documentation

---

## 25. Acceptance Criteria

### Project complete when
- Mobile-responsive public website works.
- Customer can book an appointment; cannot double-book the same barber/time.
- Booking only offers a slot when the full service fits within the barber's
  working hours; same-day booking works.
- Admins can cancel/reschedule appointments (customer self-cancel is out of
  scope); canceled appointments free their time.
- Customer can join the walk-in queue.
- Admins can close walk-in check-in for the day; the public page then shows
  "Walk-in check-in is currently closed."
- Customer deduplication works (same name + phone reuses; different name creates
  new; parents can check in children on one phone).
- A customer cannot join the active walk-in queue twice on the same day; a repeat
  attempt shows their existing queue position instead of creating a duplicate
  active queue entry.
- Every check-in creates a `check_ins` history row; live queue shows only active
  records; admin can see historical check-ins after items complete.
- Customer can choose a specific barber or "First Available"; barber dashboards
  respect the selection; admin can reassign.
- Queue updates live on admin and lobby screens.
- Lobby screen shows queue + barber preference with first name + last initial
  only; no private data; protected by display token.
- SMS logic is implemented server-side (stubbed): marking a customer "next" sends
  one queue-next SMS, logs it, and prevents duplicates; gated by the Twilio flag
  and the admin `sms_enabled` setting.
- Admin can manage appointments, barbers, services, queue, and settings (incl.
  the SMS on/off switch and walk-in open/close).
- Reports show busy/slow days, busiest hours, barber demand, service demand, and
  customer return activity, using `check_ins` data, with filters and charts, and
  can be exported to CSV.
- Role separation enforced: admins see everything; barbers see only their own
  appointments/queue plus First Available customers.
- Terms, Privacy, and SMS policy pages exist and are linked from the footer.
- SMS consent stored correctly and separated (transactional vs promotional);
  STOP opt-outs respected.
- Admin and barber routes protected via Supabase Auth; Twilio and Supabase
  secrets secure.
- Database tables created correctly; deployable to Vercel.
- SEO metadata on public pages; local SEO content for the service areas.
- `/documentation` exists and all files are filled out (incl. assumptions and
  open questions).

### Detailed acceptance criteria
The granular per-feature acceptance criteria (walk-in check-in, deduplication,
check-in history, queue, barber selection, take-next, lobby display, SMS consent,
and reports) are authoritative and must all be met. Implement and verify each one
during [Build Phases](#24-build-phases) 7–12.
