# Open Questions

Track unanswered product-owner questions here. Resolved questions move to
[assumptions.md](./assumptions.md) as confirmed decisions.

| # | Question | Why it matters | Impact if unanswered | Status |
|---|----------|----------------|----------------------|--------|
| 1 | What are the real service prices and durations? | Pricing and slot length affect bookings and revenue display. | Ships with placeholder prices that must be corrected before launch. | Open |
| 2 | Which days/hours is the shop actually open each week (any closed days)? | Drives booking availability and the lobby/queue. | Defaults to 10 AM–7 PM daily; may show slots on closed days. | Open |
| 3 | What are the real barbers besides Elis (names, bios, photos, specialties)? | Public barbers page and booking barber selection. | Uses placeholders until provided. | Open |
| 4 | What is Elis's weekly schedule and any recurring days off? | Accurate availability for booking and queue. | Defaults to shop hours. | Open |
| 5 | Should promotional SMS ever default to checked after legal review? | Compliance for marketing texts. | Stays unchecked by default (safest). | Open |
| 6 | Who are the admin user(s) and which email(s) get the admin role? | Securing the admin dashboard. | No admin can log in until provided. | Open |
| 7 | Preferred Twilio phone number / messaging service and A2P 10DLC brand details? | Required to actually send SMS. | SMS stays stubbed until provided. | Open |
| 8 | Real gallery images and barber photos, or use placeholders for launch? | Visual quality of public site. | Uses placeholders. | Open |
| 9 | Google Maps embed / Place ID and any review content to display? | Contact page map and testimonials. | Uses a generic map embed and sample reviews. | Open |
| 10 | Live Supabase project credentials (URL, anon key, service-role key) and access to apply migrations. | Needed to apply `supabase/migrations/*` and run end-to-end tests against a real database. | **Pending — see note below.** Migrations are written and the app builds against them, but they have not been applied or tested on a live database. | Open |

## Pending: live Supabase migration testing

Live testing of the database migrations is **still pending** because Supabase
project credentials are not available yet, and no local Postgres stack can be
run on this machine (the Supabase CLI, Docker, and a local PostgreSQL/`psql`
are all absent). As a result the migrations in `supabase/migrations/` have
**not** been applied or executed anywhere.

Until credentials are provided, the migrations remain the **source of truth**
and all application code is built against the new schema. To validate once
credentials exist, run from the project root:

```
supabase link --project-ref <ref>
supabase db push          # or: supabase db reset (local)
supabase gen types typescript --linked > lib/database.types.ts
```

Action item: provide a Supabase project (or local Docker + Supabase CLI) so the
migrations can be applied, types generated, and the booking/queue flows tested
end-to-end before launch.
