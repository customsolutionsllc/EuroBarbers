# Deployment

Deploy targets: **Supabase** (database + auth), **Vercel** (Next.js), **Twilio**
(SMS), **Resend** (email).

> **Status:** Migrations have not yet been applied to a live Supabase project
> from this environment (no Supabase CLI / Docker / local Postgres available
> here). The steps below are the intended path; run them against your project.
> See [open-questions.md](./open-questions.md).

## 1. Supabase project

1. Create a project at supabase.com; note the project ref, URL, anon key, and
   service-role key.
2. Apply migrations **in order** (`0001` → `0005`). Either:
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
3. Add email vars (`RESEND_API_KEY`, `BOOKING_CONFIRMATION_FROM`) to enable
   confirmation emails.
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
