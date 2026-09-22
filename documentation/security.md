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

RLS is enabled on all data tables (`0002`) and tightened by `0009_security_hardening.sql`. The latter must be applied to the deployed database; a Vercel deployment alone does not install SQL protections.

- **Public read** — `services`, `barbers`, `barber_services`,
  `barber_availability` (only what marketing/booking needs).
- **`shop_settings`** — no public read; the public uses the
  `get_shop_public()` definer function for a safe subset.
- **Appointments** — admins: all; barbers: only `barber_id = current_barber_id()`.
- **Queue / check-ins** — admins: all; authenticated barbers with a linked identity:
  their assigned rows or unassigned rows with no preference/their own preference.
  Anonymous users and accounts without a linked barber cannot read these tables.
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
  first name + last initial for the public TV. This is minimized personal data, not anonymous data.
- `get_staff_appointments(date)` — role-scoped appointments.
- `get_admin_reports(...)` — admin-only aggregates.

## Service-role key

`createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` and **bypasses RLS**. Its
module imports `server-only`, so importing it into a client component fails the
build. Treat this key as a top-tier secret.

## Lobby display privacy

The TV board shows only first name + last initial and never exposes phone,
email, or full names — appropriate for a public-facing screen.

## Secrets

All secrets are server-only env vars (see
[environment-variables.md](./environment-variables.md)). Only `NEXT_PUBLIC_*`
values reach the browser, and none of those are sensitive (the anon key is safe
by design because RLS enforces access).

## Security hardening and verification

- Migration `0009` revokes inherited `PUBLIC` execution on application definer
  functions. Booking, check-in and availability RPCs are service-role-only;
  internal customer/queue helpers are not directly executable by API roles.
- Queue changes require an authenticated admin or correctly scoped barber;
  missing identities and forged served-by IDs fail closed. Queue claims lock rows.
- The obsolete tokenless `lobby_queue_view` is removed. Use `get_lobby_queue(token)`.
- Public repeat bookings/check-ins do not overwrite an existing customer's email
  or consent flags based solely on a supplied name and phone. Trusted staff must
  handle saved contact/consent changes separately.
- JSON mutation routes cap streamed bodies at 16 KiB, require JSON, reject
  cross-origin browser requests, bound fields, and return generic public errors.
- Login redirects allow only local admin/barber paths. CSV exports neutralize
  spreadsheet formulas; confirmation email interpolations are HTML-escaped.
- Responses deny framing, disable content sniffing and use a restrictive
  referrer policy. The lobby token route sends no referrer. The CSP restricts
  framing, objects, base URLs and form destinations; it is not a full script CSP.
- Next.js is on the patched 15.5 line; a PostCSS override removes its vulnerable
  transitive pin. Re-run `npm audit` after dependency updates.

Verification: the original anonymous queue read/write, tokenless view access,
customer RPC mutation and overnight-booking bypass were reproduced on an isolated
PostgreSQL instance. `scripts/security-regression.mjs` exercises 28 checks against
a local database whose name ends in `_test`, with all fixtures rolled back:

```powershell
$env:SECURITY_TEST_DATABASE_URL = 'postgresql://USER:PASSWORD@127.0.0.1:PORT/eurobarbers_security_test'
node scripts/security-regression.mjs
```

Apply migrations `0001`–`0009` to that disposable database first. The review used
local Supabase-style auth roles/helpers; hosted Supabase Auth, Realtime, WAF and
production grants still need deployment verification.

## Remaining launch risks

Public booking/check-in still need deployment-level rate/bot protection and a
decision about verifying contact ownership. JSON limits and the booking horizon
are not rate limiting; arbitrary new identities can still request appointments
and confirmation emails. Configure persistent limits/challenges before exposing
online booking. Do not treat this review or a clean dependency audit as proof
that the deployed system is vulnerability-free.
