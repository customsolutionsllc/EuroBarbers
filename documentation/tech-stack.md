# Tech Stack

Every tool used in EuroBarbers and why it is here.

| Tool | Version | Used for |
|------|---------|----------|
| **Next.js** | 15.x (App Router) | Website rendering, API routes, server actions, middleware-based route protection |
| **React** | 19.x | UI components |
| **TypeScript** | 5.x (strict) | Type safety across the whole codebase |
| **Tailwind CSS** | 3.x | Styling |
| **Supabase JS** (`@supabase/supabase-js`) | latest | Database/auth client |
| **Supabase SSR** (`@supabase/ssr`) | latest | Cookie-based auth on the server, browser client, session refresh in middleware |
| **PostgreSQL** (via Supabase) | 15.x | Data store + business logic (functions), RLS for access control |
| **FullCalendar** (resource-timegrid) | 6.x | Admin calendar with one column per barber |
| **Twilio** (REST, no SDK) | — | Event-based "you're next" SMS |
| **Resend** | — | Booking confirmation emails |
| **Zod** | latest | Request body validation in API routes |

## Why business logic lives in Postgres

Availability, booking, and queue rules are implemented as SQL functions
(`get_available_slots`, `create_appointment`, `join_walk_in_queue`, etc.). This
keeps the database the single source of truth: the same rules apply no matter
which client calls them, and concurrency is handled by Postgres (e.g. an
exclusion constraint prevents two appointments overlapping for the same barber).

## Supabase client factories

Three server/browser clients, each with a clear scope:

| File | Factory | Scope |
|------|---------|-------|
| `lib/supabase/server.ts` | `createServerSupabaseClient()` | Server components/actions; reads the user session from cookies; respects RLS |
| `lib/supabase/browser.ts` | `createBrowserSupabaseClient()` | Client components (realtime, RPC calls under the user's session) |
| `lib/supabase/admin.ts` | `createAdminClient()` | Server-only service-role client; bypasses RLS for trusted server work |

See [environment-variables.md](./environment-variables.md) for the keys each
client needs.
