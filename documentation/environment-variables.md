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
| `RESEND_API_KEY` | For email | Sends booking confirmation emails |
| `BOOKING_CONFIRMATION_FROM` | For email | From-address for confirmation emails |
| `SMS_PROVIDER_ENABLED` | Yes | Master flag. `"true"` enables real Twilio sends; anything else keeps SMS **stubbed** (logged, not sent) |
| `TWILIO_ACCOUNT_SID` | For SMS | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For SMS | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | For SMS | Twilio sender number (E.164) |
| `FULLCALENDAR_SCHEDULER_LICENSE_KEY` | No | Server copy of the FullCalendar key |

## SMS is gated twice

A real SMS only sends when **both** are true:

1. `SMS_PROVIDER_ENABLED === "true"` **and** Twilio credentials are present
   (code: `twilioConfigured()` in `lib/sms.ts`), and
2. `shop_settings.sms_enabled === true` (admin toggle in **Settings**).

If either is off, the message is logged to `sms_logs` with status `stubbed`/`skipped`
and nothing is sent. See [sms-notifications.md](./sms-notifications.md).
