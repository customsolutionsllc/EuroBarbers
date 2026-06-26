# Project Overview

EuroBarbers is a single-location barbershop website with online booking, a
walk-in queue, staff dashboards, a lobby TV display, event-based SMS
notifications, and reports.

## What it does

- **Marketing site** — Home, Services, Team, Gallery, plus two local-SEO landing
  pages (Columbus, Dublin) and legal pages (Terms, Privacy, SMS Policy).
- **Online booking** — Customers pick a service, choose a barber or "first
  available," and confirm a time. The database is the final authority on
  availability and prevents double-booking.
- **Walk-in queue** — Customers check in from their phone, consent to SMS, and
  receive a queue position. Staff advance the queue; the next customer gets one
  SMS when they reach the front.
- **Admin dashboard** — Calendar, bookings, live queue, staff, services,
  reports, and settings (SMS on/off, walk-in open/close).
- **Barber dashboard** — A barber sees their own appointments and the queue,
  including "first available" customers, and can take the next customer.
- **Lobby TV display** — A token-gated, full-screen board showing who is in the
  chair, who is next, and who is waiting (first name + last initial only).

## Roles

| Role | Access |
|------|--------|
| Public (anon) | Marketing pages, booking, walk-in check-in, token-gated lobby display |
| Barber | Own appointments, queue (own + first-available), take next customer |
| Admin | Everything: all appointments, all queue entries, staff, services, settings, reports, exports |

## Architecture (high level)

- **Next.js 15 App Router** renders the site and hosts API routes + server
  actions. Public marketing pages are static; booking, check-in, dashboards, and
  the lobby display are dynamic.
- **Supabase (Postgres + Auth + RLS)** stores all data and enforces access.
  Business rules (availability, booking, queue) live in Postgres functions so
  the database is the single source of truth.
- **Twilio** sends the one event-based "you're next" SMS, gated by both a
  global env flag and an admin-controlled `shop_settings.sms_enabled` toggle.
- **Resend** sends booking confirmation emails when an email is provided.

```
Browser ──► Next.js (pages, API routes, server actions, middleware)
                │
                ├─► Supabase (RLS + SQL functions)  ◄── source of truth
                ├─► Twilio (queue-next SMS)
                └─► Resend (booking confirmation email)
```

See [tech-stack.md](./tech-stack.md) for the role of each tool and
[security.md](./security.md) for how access is enforced.
