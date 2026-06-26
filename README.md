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

Run `supabase/schema.sql` in Supabase SQL Editor. The important safety rule is enforced in PostgreSQL:

```sql
EXCLUDE USING gist (staff_id WITH =, time_range WITH &&)
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

- The public booking flow calls `/api/bookings`, which delegates booking creation to the Supabase RPC `create_booking`.
- Email confirmation uses Resend when `RESEND_API_KEY` is present.
- Twilio is intentionally left for a later reminder worker.
- FullCalendar resource views may require a commercial Scheduler license for production use.
