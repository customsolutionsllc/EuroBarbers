# Environment Variables

All variables, where they are used, and whether they are public. The template is
[`/.env.example`](../.env.example).

> **Public vs private:** Any variable prefixed `NEXT_PUBLIC_` is embedded in the
> browser bundle and is **not secret**. Everything else is server-only and must
> never be exposed to the client.

## Public (browser-exposed)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL for browser + server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key used by browser/server clients; RLS enforces access |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical site URL for metadata, sitemap, robots, OpenGraph |
| `NEXT_PUBLIC_FULLCALENDAR_SCHEDULER_LICENSE_KEY` | No | FullCalendar premium key (falls back to the open-source token) |

## Server-only (secret)

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service-role client (`createAdminClient`) for trusted server work; bypasses RLS |
| `RESEND_API_KEY` | For email | Sends booking confirmations and hiring/contact form emails through Resend |
| `BOOKING_CONFIRMATION_FROM` | For email | Verified Resend sender used for all website emails, including hiring/contact inquiries |
| `SMS_PROVIDER_ENABLED` | Yes | Master flag. `"true"` enables real Twilio sends; anything else keeps SMS **stubbed** (logged, not sent) |
| `TWILIO_ACCOUNT_SID` | For SMS | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For SMS | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | For SMS | Twilio sender number (E.164) |
| `FULLCALENDAR_SCHEDULER_LICENSE_KEY` | No | Server copy of the FullCalendar key |

### Hiring and contact email delivery

Both variables above must be configured in Vercel for the deployment environment.
The sender must use a domain verified in the same Resend account; the customer's
email is used only as Reply-To, never as the From-address. Do not put the API key
in source control or any `NEXT_PUBLIC_*` variable.

- `/we-are-hiring` submits required first/last name, phone, email and a PDF/DOCX
  resume to `/api/applicants`. Resume maximum: 3 MiB; total multipart request: 4 MiB.
- `/contact-us` submits required first/last name, email, phone and description
  to `/api/contact`. Description maximum: 5,000 characters; JSON request: 16 KiB.
- Both deliver only to `Info@Eurobarbers.com`. Subjects are `New Applicant` and
  `New message`, respectively. Hiring attaches the resume; contact has no attachment.
- Inquiries return success only when Resend accepts the message with an ID.
  Missing configuration returns 503; provider rejection/failure returns 502.
  These responses must not be presented as a successful submission.
- Resumes are not written to the public directory, local disk or database.
  Extension and signature checks are not malware scanning; treat inbound resumes
  as untrusted documents and use normal mailbox attachment protection.
- Configure appropriate deployment bot/rate controls before making forms public;
  body and file size limits are not anti-spam protection.

Local smoke verification used an isolated Resend transport fixture, never a real
inbox. Production configuration and a real delivery check are still required
before launch. JavaScript is required for the interactive forms; their native
method is POST so personal data cannot fall back to a query-string submission.

## SMS is gated twice

A real SMS only sends when **both** are true:

1. `SMS_PROVIDER_ENABLED === "true"` **and** Twilio credentials are present
   (code: `twilioConfigured()` in `lib/sms.ts`), and
2. `shop_settings.sms_enabled === true` (admin toggle in **Settings**).

If either is off, the message is logged to `sms_logs` with status `stubbed`/`skipped`
and nothing is sent. See [sms-notifications.md](./sms-notifications.md).
