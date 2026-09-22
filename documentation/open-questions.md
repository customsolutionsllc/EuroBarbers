# Open Questions

Track unanswered product-owner questions here. Resolved questions move to
[assumptions.md](./assumptions.md) as confirmed decisions.

| # | Question | Why it matters | Impact if unanswered | Status |
|---|----------|----------------|----------------------|--------|
| 1 | What are the real service prices and durations? | Pricing and slot length affect bookings and revenue display. | Ships with placeholder prices that must be corrected before launch. | Open |
| 2 | Which days/hours is the shop actually open each week (any closed days)? | Business listing and booking availability must agree. | Public text/schema currently use 11 AM–8 PM; historical seeded barber schedules use 10 AM–7 PM. Confirm and align schedules before online booking. | Open |
| 3 | What are the real barbers besides Elis (names, bios, photos, specialties)? | Public barbers page and booking barber selection. | Uses placeholders until provided. | Open |
| 4 | What is Elis's weekly schedule and any recurring days off? | Accurate availability for booking and queue. | Defaults to shop hours. | Open |
| 5 | Should promotional SMS ever default to checked after legal review? | Compliance for marketing texts. | Stays unchecked by default (safest). | Open |
| 6 | Who are the admin user(s) and which email(s) get the admin role? | Securing the admin dashboard. | No admin can log in until provided. | Open |
| 7 | Preferred Twilio phone number / messaging service and A2P 10DLC brand details? | Required to actually send SMS. | SMS stays stubbed until provided. | Open |
| 8 | Real gallery images and barber photos, or use placeholders for launch? | Visual quality of public site. | Uses placeholders. | Open |
| 9 | Verified Google Business Profile/Place ID and real review content? | Local search accuracy and trust. | Uses an address-based directions link; no fabricated review markup is added. | Open |
| 10 | Authorization/access to apply and verify migration `0009` on hosted Supabase? | Code deployment alone cannot fix deployed RPC/RLS permissions. | Local PostgreSQL checks passed; hosted database state is unverified. | Open |
| 11 | Is the configured preview Supabase project isolated from production? | Safe deployment testing. | Vercel authentication is available; preview Supabase variables exist, but database isolation has not been independently verified. Do not submit test writes until confirmed. | Open |
| 12 | Production bot/rate limits and contact-ownership verification? | Prevent forged bookings, queue spam and unwanted emails. | Application body limits are not anti-bot protection. | Open |

## Pending: live Supabase migration testing

The review executed migrations `0001`–`0009` on a disposable local PostgreSQL
instance and reproduced/fixed the anonymous-access and overnight-booking bugs.
`scripts/security-regression.mjs` retains 28 SQL checks. This does not establish
which migrations or grants are installed on hosted Supabase.

Next: apply `0009` to an authorized test database and verify Auth/Realtime and
complete booking/check-in flows there. Vercel authentication is available and
the production rollback reference is recorded. Production web deployment uses
the GitHub `main` integration; it does not apply SQL migrations. Do not replay
seed/demo scripts in production.
