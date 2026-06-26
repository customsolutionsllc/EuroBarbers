# EuroBarbers Documentation

This folder documents the EuroBarbers website + booking + walk-in queue system.
The single source of truth for requirements is [`/requirements.MD`](../requirements.MD);
these files explain how the system is designed and built.

## Index

| Document | Purpose |
|----------|---------|
| [project-overview.md](./project-overview.md) | What EuroBarbers is, features, roles, architecture |
| [tech-stack.md](./tech-stack.md) | Each tool and what it is used for |
| [environment-variables.md](./environment-variables.md) | All env vars (public vs private) |
| [database-schema.md](./database-schema.md) | Every table, field, relationship, and rule |
| [booking-logic.md](./booking-logic.md) | Appointment booking and availability logic |
| [walk-in-queue.md](./walk-in-queue.md) | Walk-in check-in, deduplication, and queue logic |
| [sms-notifications.md](./sms-notifications.md) | Twilio SMS (event-based queue-next), consent, logs |
| [admin-dashboard.md](./admin-dashboard.md) | Admin dashboard features |
| [barber-dashboard.md](./barber-dashboard.md) | Barber dashboard features |
| [reports.md](./reports.md) | Reports, filters, and data sources |
| [security.md](./security.md) | Auth, RLS, route protection, secret handling |
| [deployment.md](./deployment.md) | Deploying to Vercel + Supabase + Twilio |
| [assumptions.md](./assumptions.md) | Tracked assumptions and confirmed decisions |
| [open-questions.md](./open-questions.md) | Tracked open questions |

## Status

All documentation files in the index above are written. One item is pending
real-world execution: the database migrations have not yet been applied to a
live Supabase project from this environment (no Supabase CLI / Docker / local
Postgres available here). The migrations in `supabase/migrations/` are the
source of truth and are validated by review and the app's TypeScript build; see
[deployment.md](./deployment.md) and [open-questions.md](./open-questions.md).
