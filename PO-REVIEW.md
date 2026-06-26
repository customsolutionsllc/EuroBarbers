# EuroBarbers — Project Review for Product Owner

**Prepared:** 2026-06-22
**Purpose:** Plain-language summary of what we are building, the decisions made
so far, and the few things we still need from you. Please review and mark the
**sign-off** section at the bottom.

The full technical spec lives in `requirements.MD`. This document is the
business-friendly version for review.

---

## 1. What we are building

A premium website and operations system for EuroBarbers with five parts:

1. **Public website** — luxury homepage, services, barbers, gallery, and contact
   pages, optimized to show up in Google for the Columbus area.
2. **Online booking** — customers pick a service, a barber, a date, and an
   available time, then enter their details. The system prevents double-booking.
3. **Walk-in check-in + live queue** — customers who walk in join a queue from
   their phone or a shop tablet, choosing a specific barber or "First Available."
   A TV screen in the shop shows who's being served and who's next.
4. **Staff tools** — an admin dashboard (manage everything) and a barber
   dashboard (see your own day, take the next customer).
5. **Text-message notifications** — when a customer is marked "next" in the
   queue, they get a text telling them to come back. (See decision #5 for scope.)

---

## 2. Decisions already confirmed (2026-06-22)

These were agreed and are now locked in. If any of these are wrong, please flag
it before we build further.

| # | Topic | What we decided |
|---|-------|-----------------|
| 1 | **System foundation** | Rebuild the database around real "customers," "visits," and "queue" records so reporting is accurate. (Replaces an earlier simpler setup.) |
| 2 | **Texting (Twilio)** | We build the texting feature now but keep it switched **off** until your Twilio account and carrier registration are ready. Email confirmations are sent only when the customer provides an email address. |
| 3 | **Logins** | Each barber gets their own login; admins get an admin login. Both dashboards are password-protected. |
| 4 | **Lobby TV screen** | The TV screen uses a secret link so it can run on a TV without a login but can't be found by the public. It never shows phone numbers, emails, or full last names. |
| 5 | **Text scope** | The only SMS notification required for launch is the queue "you are next" text. Appointment SMS reminders (24-hour / 2-hour) are intentionally **out of scope** unless the business owner later requests them. |
| 6 | **Location** | One physical shop: **7370 Sawmill Road, Columbus, OH 43235**. Dublin, Powell, Lewis Center, Hilliard, and Marysville are used for Google/SEO only — not separate locations. |
| 7 | **Barbers** | **Elis** is the only confirmed barber; additional barbers are added through the admin dashboard. |
| 8 | **Services & prices** | We use a standard service list with **placeholder prices** you can edit anytime. |
| 9 | **Email** | Customer email is **optional** for booking and check-in. |
| 10 | **Walk-in wait time** | The check-in screen shows the customer's **place in line** only, not an estimated wait time. |
| 11 | **Cancellations & reschedules** | Customers cancel or reschedule by **calling the shop**; admins can cancel/reschedule any appointment. Online customer self-cancellation is **not included** unless you request it. |
| 12 | **Booking hours & cutoff** | Same-day booking is allowed. A time slot only appears if the **entire service fits inside the barber's working hours** before closing — e.g., a 30-minute service will not show 15 minutes before close. |
| 13 | **Walk-in queue closing** | Admins can **manually close walk-in check-in** for the day. When closed, the public check-in page shows **"Walk-in check-in is currently closed."** |
| 14 | **Texting on/off control** | Admin Settings includes an **SMS Enabled: on/off** switch that controls all outgoing texts. |
| 15 | **Legal pages** | **Terms of Service**, **Privacy Policy**, and an **SMS/messaging policy** page are required for launch because the site collects names, phone numbers, emails, and SMS consent. |
| 16 | **Report exports** | Admins can **export** check-ins, customers, and reports to **CSV**. |
| 17 | **Role separation** | **Admins see everything.** A **barber sees only their own appointments and queue, plus First Available customers.** |
| 18 | **Active queue duplicate prevention** | If the same customer already has an active walk-in queue record for the current day (status `waiting`, `next`, or `in_chair`), the system does **not** create another active queue entry — it shows their existing queue position instead. A new check-in is only created if the previous visit was completed, canceled, no-show, or from a different day. |

**The "you are next" text will say:**
> EuroBarbers: You are next in queue. Your barber should be ready in about 10–20
> minutes. Please be nearby.

---

## 3. What already exists vs. what's being built

| Already built | Still to build |
|---------------|----------------|
| Website framework and styling | Customer & visit records with duplicate-prevention |
| Public pages (home, services, team, gallery, booking) | Walk-in check-in page |
| Basic online booking with double-booking prevention | Live queue + TV lobby screen |
| Email booking confirmation | Barber dashboard |
| Admin pages (not yet password-protected) | Logins / security on admin & barber areas |
| | Text-message sending (built, switched off) + admin on/off control |
| | Walk-in check-in open/close control |
| | Reports & charts + CSV export |
| | Terms / Privacy / SMS policy pages |
| | Final SEO, polish, and deployment docs |

---

## 4. How customers are kept from duplicating

A returning customer is recognized as the **same person** only when first name,
last name, and phone number all match. This means:

- The same person checking in again is **not** duplicated.
- A parent can check in **multiple children on one phone number** because the
  names differ.

Every visit is also saved separately, so reports show real traffic (busy days,
slow days, busiest hours, barber demand, etc.) — not just a list of people.

---

## 5. Build sequence

We build in safe phases and summarize after each one:

1. Documentation ✅ (in progress)
2. Database rebuild
3. Logins & security setup
4. Public website polish + legal pages (Terms, Privacy, SMS policy)
5. Booking flow (with same-day + working-hours cutoff rules)
6. Walk-in check-in (with admin open/close control)
7. Admin dashboard (incl. SMS on/off setting)
8. Barber dashboard
9. Live queue / TV screen
10. Text messaging (built, switched off)
11. Reports + CSV export
12. SEO + final polish
13. Deployment

---

## 6. What we need from you (action items)

None of these block us from starting — we'll use safe placeholders — but we need
them before launch.

| # | We need | Why |
|---|---------|-----|
| 1 | **Real service prices and durations** | So bookings and the menu are correct. |
| 2 | **Exact open days & hours each week** (any closed days?) | So we don't offer times the shop is closed. |
| 3 | **Real barbers besides Elis** (names, photos, short bios, specialties) | For the barbers page and booking. |
| 4 | **Elis's weekly schedule and days off** | So available times are accurate. |
| 5 | **Admin email address(es)** that should have admin access | To set up the secure admin login. |
| 6 | **Twilio details** (phone number + business/carrier registration) | Required to actually turn texting on. |
| 7 | **Gallery photos & barber photos** (or OK to use placeholders for launch?) | For the look of the site. |
| 8 | **Google Maps location / reviews** to display | For the contact page and testimonials. |

---

## 7. Important notes & risks

- **Texting is off until Twilio is ready.** US carriers require a registration
  step (A2P 10DLC) before business texts can send. We'll wire everything up so
  it's one switch to turn on once that's approved.
- **Database rebuild** replaces the current simpler booking setup. Existing test
  bookings would not carry over; this is expected since we're not live yet.
- **Promotional/marketing texts** are kept separate from queue/appointment texts
  and are **optional** for customers and **unchecked by default** for legal
  safety. We recommend a quick legal review before any marketing texts go out.
- **Privacy on the TV screen:** only first name + last initial are ever shown.

---

## 8. Definition of done

The project is complete when:

- The website works on mobile and looks premium.
- Customers can book online without double-booking, and can join the walk-in
  queue.
- Booking never offers a time unless the full service fits inside the barber's
  working hours; same-day booking works.
- Cancellations and reschedules are handled by admins (customers call the shop).
- Returning customers aren't duplicated; every visit is recorded for reporting.
- A customer cannot accidentally join the active walk-in queue twice on the same
  day; if they try again, the system shows their existing queue position instead
  of creating a duplicate queue entry.
- Admins can close walk-in check-in for the day; the public page then shows it's
  closed.
- The TV lobby screen updates live and hides private info.
- Admin and barber dashboards work and are password-protected; admins see
  everything, barbers see only their own work plus First Available customers.
- Admin Settings has an SMS on/off switch.
- The "you are next" text sends once per customer and is logged (once Twilio is
  on).
- Reports show busy/slow days, busiest hours, barber and service demand, and
  returning-customer activity, and can be exported to CSV.
- Terms, Privacy, and SMS policy pages are live.
- The site is deployable, secure, and SEO-ready for the Columbus area.

---

## 9. Sign-off

**Status: APPROVED by Product Owner on 2026-06-22.**
Confirmed the decisions in section 2, approved the database rebuild, and approved
using placeholders until final business details are provided.

- [x] I confirm the **decisions** in section 2.
- [x] I will provide the **action items** in section 6 (or approve placeholders
      for launch).
- [x] I approve proceeding with the **database rebuild** (section 7).
- [ ] Changes I'd like (write below):

> _Notes from Product Owner:_
> No additional changes at this time.
