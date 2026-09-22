# EuroBarbers

Luxury barber website and custom booking system built with Next.js, TypeScript, Tailwind, shadcn/ui-style components, Framer Motion, Supabase PostgreSQL, FullCalendar, and Resend.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` and fill in the values.

```powershell
Copy-Item .env.example .env.local
```

## Database

Apply `supabase/migrations/` in order through `0009_security_hardening.sql` (see `documentation/deployment.md`). Existing databases already at `0008` need only the security migration, not a seed reset. The important booking safety rule is enforced in PostgreSQL:

```sql
EXCLUDE USING gist (barber_id WITH =, time_range WITH &&)
```

That rejects overlapping bookings for the same barber even if two requests arrive at the same time.

## Main routes

- `/`
- `/services`
- `/team`
- `/gallery`
- `/book`
- `/columbus-oh-barber-shop`
- `/dublin-oh-barber-shop`
- `/admin`
- `/admin/calendar`
- `/admin/bookings`
- `/admin/staff`
- `/admin/services`

## Notes

- `/book` currently offers phone booking and walk-in directions. The retained booking API delegates to `create_appointment`; online booking is not mounted on the public page.
- Email confirmation uses Resend when `RESEND_API_KEY` is present.
- Twilio is intentionally left for a later reminder worker.
- FullCalendar resource views may require a commercial Scheduler license for production use.
