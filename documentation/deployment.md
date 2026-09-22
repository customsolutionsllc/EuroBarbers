# Deployment

Deploy targets: **Supabase** (database + auth), **Vercel** (Next.js), **Twilio**
(SMS), **Resend** (email).

> **Review status:** Migrations `0001`–`0009` were executed on isolated local
> PostgreSQL with Supabase-style roles/auth helpers. Production Supabase state
> was not inspected or changed. Apply and verify `0009` separately from the web
> deployment; it closes direct anonymous database access.

## 1. Supabase project

1. Create a project at supabase.com; note the project ref, URL, anon key, and
   service-role key.
2. For a fresh database, apply migrations **in order** (`0001` → `0009`). Either:
   - **Dashboard:** SQL Editor → paste each file in order, or
   - **CLI:**
     ```bash
     supabase link --project-ref <your-ref>
     supabase db push
     ```
3. (Optional) Generate types: `supabase gen types typescript --linked`.

### Migration order

| Order | File | Adds |
|-------|------|------|
| 1 | `0001_initial_schema.sql` | Tables, helpers |
| 2 | `0002_functions_and_rls.sql` | Functions + RLS policies |
| 3 | `0003_seed.sql` | Shop settings, 7 services, 3 barbers, availability |
| 4 | `0004_queue_views_and_realtime.sql` | Staff/lobby read functions + realtime publication |
| 5 | `0005_reports.sql` | `get_admin_reports` |
| 6 | `0006_schedule_management.sql` | Admin schedules and time off |
| 7 | `0007_service_management.sql` | Service management |
| 8 | `0008_barber_and_service_management.sql` | Barber/service management |
| 9 | `0009_security_hardening.sql` | RPC privileges, queue RLS/authorization, contact preservation, booking bounds |

For an existing database already at `0008`, apply only `0009` in a transaction.
`ALL_MIGRATIONS.sql` includes the same hardening for fresh installations. Do not
use `APPLY_NOW.sql` as a production security patch: it contains demo-data cleanup.
Keep a database backup and do not replay old migrations after `0009`, because
their earlier definitions can reintroduce the vulnerabilities.

## 2. Create staff users

For each admin/barber:

1. Create an auth user (Dashboard → Authentication → Users, or invite).
2. Insert a `profiles` row linking the user to a role:
   ```sql
   insert into profiles (id, role, barber_id)
   values ('<auth-user-uuid>', 'admin', null);
   -- or for a barber:
   -- values ('<auth-user-uuid>', 'barber', '<barber-uuid>');
   ```
3. For barbers, also set `barbers.auth_user_id` to the auth user's UUID.

## 3. Vercel

1. Import the repo into Vercel.
2. Set environment variables (see
   [environment-variables.md](./environment-variables.md)). At minimum:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Add email vars (`RESEND_API_KEY`, `BOOKING_CONFIRMATION_FROM`) using a verified
   Resend sender. These are required for hiring/contact form delivery as well as
   booking confirmations. Verify the recipient `Info@Eurobarbers.com` receives a
   controlled test before publishing these forms; a successful build alone does
   not establish email delivery.
4. Deploy. Marketing pages are static; booking, check-in, dashboards, and the
   lobby display are server-rendered on demand.

## 4. SMS (Twilio)

1. Buy/verify a Twilio number; set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   `TWILIO_PHONE_NUMBER`.
2. Complete **A2P 10DLC** registration before sending to US numbers in
   production.
3. Set `SMS_PROVIDER_ENABLED=true` **and** turn on SMS in the admin **Settings**
   page. Until both are on, SMS stays stubbed (logged, not sent). See
   [sms-notifications.md](./sms-notifications.md).

## 5. Lobby TV display

Open Settings to copy the token-gated URL
(`/queue-display/<queue_display_token>`) and load it full-screen on the shop's
TV/kiosk. Rotate the token in `shop_settings` if it leaks.

## 6. Post-deploy checks

- Sign in as admin → toggle SMS/walk-in → confirm `shop_settings` updates.
- Place a test booking → confirm no double-booking and (if email set) a
  confirmation email.
- Check in a walk-in → mark **next** → confirm an `sms_logs` row
  (`sent`/`stubbed`).
- Open the lobby URL with a wrong token → expect "This display link is invalid."

## 7. Search and local-business launch checks

- Verify `NEXT_PUBLIC_SITE_URL` is the actual HTTPS canonical domain. Preview
  deployments are noindexed; public production pages use self-canonicals.
- Confirm the address, phone, prices and daily hours in `lib/site-config.ts`
  against the Google Business Profile. Visible hours and `HairSalon` structured
  data now share the same values (currently 11 AM–8 PM); this is consistency,
  not independent confirmation of opening hours.
- Target Columbus and Dublin customers from the single Sawmill Road location.
  Nearby customers are welcome; do not invent additional branches or doorway pages.
- `/team` contains sample staff and `/gallery` uses stock photos: both are
  noindexed and omitted from the sitemap until real content is supplied.
- Submit `/sitemap.xml` to Google Search Console and inspect the main/location
  URLs and structured data after deployment. Verify the generated Open Graph
  image, redirects, mobile layout and real Core Web Vitals on the live domain.
- Keep Google Business Profile categories, NAP, hours and authentic photos
  accurate; request genuine customer reviews without gating or incentives.
  Rankings depend on relevance, distance, prominence and competitors. No #1
  placement or rich-result appearance is guaranteed.

## 8. Production deployment and rollback

Vercel is connected to `https://github.com/customsolutionsllc/EuroBarbers.git`.
A push to `main` automatically starts the production build; no manual
`vercel deploy` step is needed. Verify `npm run build` succeeds, then stage the
reviewed change set, commit and push `origin main`. Run these as separate checked
steps: a semicolon-separated PowerShell one-liner does not stop on build failure.

Verify the resulting deployment in Vercel and visit `https://www.eurobarbers.com`.
Use Ctrl+Shift+R to bypass the browser cache. Environment variables live in Vercel
project settings, not source control. Do not submit QA bookings or send messages
to production; use an isolated database/email environment for write-path tests.

The pre-review source revision is `7d4695cb84ae57ff861a7328db2af7f3243577fe`.
A source ZIP and rollback manifest are retained outside the repository in the
local OMP backups directory. Restore only this change set on request, preserving
later unrelated edits. Code/deployment rollback does not undo customer data.
Production SQL was not changed during this review; reverting security SQL later
would need a separate, explicitly reviewed database rollback.

The production rollback reference captured before this rollout is
`dpl_Fp8bMoUkNTMAMcvyMWHeUHtzadcu`
(`https://eurobarbers-9q15mew64-euro-barbers.vercel.app`). A requested source rollback
should be a reviewed revert commit on `main`, preserving subsequent unrelated
work; restoring the previous Vercel deployment is also available when authorized.
