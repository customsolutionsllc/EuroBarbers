# Security

How EuroBarbers protects data and routes. Defense is layered: middleware →
server guards → Postgres RLS → `SECURITY DEFINER` functions.

## Authentication

- Supabase Auth with email/password. Login is at `/login`
  ([app/login/login-form.tsx](../app/login/login-form.tsx)) via
  `signInWithPassword`.
- Sessions are cookie-based (`@supabase/ssr`). `middleware.ts` refreshes the
  session on each request to protected routes.
- Sign-out: `POST /auth/signout` clears the session and redirects to `/login`.

## Route protection (three layers)

1. **Middleware** — `middleware.ts` matches `/admin/:path*` and `/barber/:path*`
   and redirects unauthenticated users to `/login`.
2. **Server guards** — `requireAdmin()` and `requireStaff()`
   ([lib/auth.ts](../lib/auth.ts)) run in the admin/barber layouts and redirect
   based on the user's `profiles.role`.
3. **Database RLS** — even if a request reaches the data layer, Row Level
   Security decides what is readable/writable.

## Row Level Security (RLS)

RLS is enabled on all data tables (migration `0002`). Highlights:

- **Public read** — `services`, `barbers`, `barber_services`,
  `barber_availability` (only what marketing/booking needs).
- **`shop_settings`** — no public read; the public uses the
  `get_shop_public()` definer function for a safe subset.
- **Appointments** — admins: all; barbers: only `barber_id = current_barber_id()`.
- **Queue / check-ins** — admins: all; barbers: rows assigned to them or
  "first available" (`barber_id IS NULL`).
- **Customers / sms_logs** — admin only.
- **Profiles** — a user can read their own row (`id = auth.uid()`) or any row if
  admin; only admins write.

Helper predicates `is_admin()` and `current_barber_id()` drive these policies.

## SECURITY DEFINER functions

Some reads need controlled, role-scoped shaping that plain RLS can't express
(e.g. hiding phone numbers from barbers, token-gating the lobby display). These
run as definer functions with internal role checks:

- `get_staff_queue()` — role-scoped queue; phone is admin-only.
- `get_lobby_queue(token)` — token-gated; raises `INVALID_TOKEN`; returns only
  first name + last initial (no PII) for the public TV.
- `get_staff_appointments(date)` — role-scoped appointments.
- `get_admin_reports(...)` — admin-only aggregates.

## Service-role key

`createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` and **bypasses RLS**. It
is imported only in server-only modules and never shipped to the browser. Treat
this key as a top-tier secret.

## Lobby display privacy

The TV board shows only first name + last initial and never exposes phone,
email, or full names — appropriate for a public-facing screen.

## Secrets

All secrets are server-only env vars (see
[environment-variables.md](./environment-variables.md)). Only `NEXT_PUBLIC_*`
values reach the browser, and none of those are sensitive (the anon key is safe
by design because RLS enforces access).
