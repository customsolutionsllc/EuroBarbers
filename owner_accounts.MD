# Owner Accounts & Setup Guide

**For:** The EuroBarbers owner (non-technical)
**Goal:** Create every online account this website needs, and collect the secret
"keys" your developer needs to switch everything on.

---

## How to use this guide

- Do these in order. Each section is one account.
- Whenever you see **🔑 COPY THIS**, copy that value into the collection sheet at
  the very bottom of this document (Section 8). That sheet is what you hand back
  to your developer.
- Treat every key like a house key or a password. Don't post them in text
  messages, screenshots, or emails if you can avoid it. The collection sheet at
  the bottom is the one safe place to keep them while you set up.
- Take your time. Nothing here charges your card unless the section clearly says
  "billing" or "paid."

> **What each service does, in one line:**
> - **Supabase** = the database (stores customers, bookings, the queue).
> - **Resend** = sends booking confirmation emails.
> - **Twilio** = sends the "you're next in line" text messages.
> - **Vercel** = puts the website online (hosting).
> - **Domain** = your web address, e.g. `eurobarbers.com`.

---

## 1. Supabase (the database) — REQUIRED

This stores everything: customers, appointments, the walk-in queue, and staff
logins. Without it, booking and the dashboards do not work.

### 1a. Create the account
1. Go to **https://supabase.com**.
2. Click **Start your project** (top right).
3. Click **Sign in with GitHub** if you have GitHub, OR click **Continue with
   email**, type your email and a password, and click **Sign Up**.
4. If asked to verify your email, open the email Supabase sends and click the
   confirmation link.

### 1b. Create the project
1. After signing in you'll see the **dashboard**. Click **New project** (green
   button).
2. If it asks you to create an **Organization** first: type `EuroBarbers` in the
   name box, choose **Personal** / the free plan, and click **Create
   organization**.
3. Now fill in the project form:
   - **Name:** `eurobarbers`
   - **Database Password:** click **Generate a password**, then click the
     **copy** icon. **🔑 COPY THIS** → paste it into Section 8 as "Supabase DB
     password." (You may need it later; keep it safe.)
   - **Region:** pick the one closest to Ohio, e.g. **East US (North Virginia)**.
   - **Plan:** **Free** is fine to start.
4. Click **Create new project**. Wait 1–2 minutes while it says "Setting up
   project."

### 1c. Get the 3 Supabase keys your developer needs
1. In the left sidebar, click the **gear icon** ⚙️ (**Project Settings**) at the
   bottom.
2. Click **API** (under "Configuration" / "Project Settings").
3. You'll see a section called **Project URL**:
   - Copy the URL (looks like `https://abcdefgh.supabase.co`).
   - **🔑 COPY THIS** → Section 8 as "SUPABASE URL."
4. Below that is **Project API Keys**. You'll see two keys:
   - **`anon` `public`** — click **Copy**. **🔑 COPY THIS** → Section 8 as
     "SUPABASE ANON KEY." (This one is safe to be public.)
   - **`service_role` `secret`** — click **Reveal**, then **Copy**.
     **🔑 COPY THIS** → Section 8 as "SUPABASE SERVICE ROLE KEY."
     ⚠️ **This one is like a master key — never share it publicly or put it on the
     website. Only your developer uses it.**

> You do **not** need to build any tables yourself. Your developer has the
> database setup files ("migrations") and will run them, or will send you a
> block of text to paste into Supabase's **SQL Editor**. If they ask you to do
> that: left sidebar → **SQL Editor** → **New query** → paste → **Run**.

### 1d. (Later) Create the staff logins
Once your developer says the database is set up, you'll create one login per
person (you = admin, each barber = barber). Your developer will either do this or
walk you through it. For each person you'll provide an **email address** they'll
use to sign in. Decide now:
- **Admin email(s):** the email YOU want to use to log into the admin dashboard.
  **🔑 COPY THIS** → Section 8 as "Admin login email."

---

## 2. Resend (confirmation emails) — RECOMMENDED

This sends customers a confirmation email when they book (only if they enter an
email; email is optional for them).

### 2a. Create the account
1. Go to **https://resend.com**.
2. Click **Sign Up** (top right).
3. Sign up with Google or with your email + a password. Verify your email if
   asked.

### 2b. Get the API key
1. After logging in, look at the left sidebar and click **API Keys**.
2. Click **Create API Key**.
3. **Name:** type `eurobarbers`.
4. **Permission:** leave it as **Full access** (or "Sending access").
5. Click **Add** / **Create**.
6. A key starting with `re_...` appears. Click **Copy**. **🔑 COPY THIS** →
   Section 8 as "RESEND API KEY."
   ⚠️ You can only see this key once. If you lose it, just create a new one.

### 2c. Verify your sending domain (do this once you own a domain — see Section 5)
To send email from `bookings@yourdomain.com` instead of a generic address:
1. In Resend, left sidebar → **Domains** → **Add Domain**.
2. Type your domain (e.g. `eurobarbers.com`) and click **Add**.
3. Resend shows several **DNS records** (TXT/CNAME rows). These need to be added
   wherever you bought your domain (Section 5). This part is fiddly — it's
   completely fine to **send this list to your developer** to enter for you.
4. Until the domain is verified, your developer can use Resend's test address so
   emails still work for testing.
- **🔑 COPY THIS** → Section 8 as "Email 'from' address," e.g.
  `EuroBarbers <bookings@eurobarbers.com>` (or tell your developer to use the
  test address for now).

---

## 3. Twilio (text messages) — REQUIRED ONLY FOR TEXTING

This sends the **"You are next in queue"** text. Texting stays **switched off**
until this is fully set up and approved by the phone carriers, so you can launch
the website first and turn texting on later.

> ⚠️ **Important expectation:** In the United States, businesses must complete a
> registration called **A2P 10DLC** before texts will reliably send. This
> involves entering your business details and can take a few business days to get
> approved. Start it early. None of this blocks the rest of the website.

### 3a. Create the account
1. Go to **https://www.twilio.com/try-twilio**.
2. Fill in your name, email, and a password. Click **Start your free trial**.
3. Verify your email (click the link Twilio emails you).
4. Verify your **personal mobile number** (Twilio texts you a code; type it in).
5. When asked a few questions ("What do you want to do?"), you can choose:
   - "SMS", "With code/no code? → No code", "Build" — these just tailor the
     dashboard; any reasonable answers are fine.

### 3b. Get your account keys
1. You'll land on the **Twilio Console** (dashboard).
2. On the main page find the **Account Info** panel. You'll see:
   - **Account SID** (starts with `AC...`). Click **Copy**. **🔑 COPY THIS** →
     Section 8 as "TWILIO ACCOUNT SID."
   - **Auth Token** — click **Show**, then **Copy**. **🔑 COPY THIS** → Section 8
     as "TWILIO AUTH TOKEN." ⚠️ Keep this secret.

### 3c. Get a phone number
1. Left sidebar → **Phone Numbers** → **Manage** → **Buy a number**
   (on a trial you may **Get a trial number** instead).
2. Make sure **SMS** is checked in the capabilities.
3. Pick a US number (a local Ohio area code like 614 is nice but optional) and
   click **Buy** / **Choose this number**.
4. The number looks like `+16145551234`. **🔑 COPY THIS** → Section 8 as
   "TWILIO PHONE NUMBER."

### 3d. Register your business for texting (A2P 10DLC)
This is the approval step that lets a business text customers.
1. Left sidebar → **Messaging** → **Regulatory Compliance** → **A2P 10DLC**
   (Twilio may also call this **Trust Hub** / **Brand Registration**).
2. Click **Get started** and follow the wizard. You'll need:
   - Legal business name, address (7370 Sawmill Road, Columbus, OH 43235), and
     phone.
   - **EIN** (business tax ID) if you have one — strongly recommended, it speeds
     approval. If you're a sole proprietor without an EIN, choose the
     **sole proprietor** path.
   - A description of what you'll text: e.g. *"Transactional notifications to
     customers who joined our barbershop walk-in queue, telling them when they
     are next in line. Customers opt in at check-in."*
   - Sample message: paste the exact text:
     > EuroBarbers: You are next in queue. Your barber should be ready in about
     > 10–20 minutes. Please be nearby.
3. Submit and wait for approval (often 1–3 business days). Twilio emails you when
   it's approved.

> 💡 This step is the most confusing one. It's completely reasonable to do it on
> a screen-share with your developer. Once approved, your developer flips one
> switch and texting works.

---

## 4. Vercel (puts the website online) — REQUIRED TO GO LIVE

Vercel hosts the website so the public can visit it. Your developer usually
drives this, but it's connected to *your* code, so it's best the account is in
your name (or your business's).

### 4a. Create the account
1. Go to **https://vercel.com/signup**.
2. Click **Continue with GitHub** (recommended) or use email.
3. Choose the **Hobby (free)** plan to start — it's enough to launch. You can
   upgrade later if needed.

### 4b. What your developer needs
- Your developer will **import the project** and enter all the keys from Section
  8 into Vercel's **Settings → Environment Variables**. You don't have to do this
  yourself — just make sure they have access to the account, or add them as a
  member (Vercel: **Settings → Members → Invite**).
- **🔑 COPY THIS** → Section 8: note "Vercel account owner email" so your
  developer knows whose account it is.

---

## 5. Domain name (your web address) — REQUIRED TO GO LIVE

This is your address like `eurobarbers.com`.

### 5a. Buy a domain
1. Go to a registrar — easy options: **https://www.namecheap.com** or
   **https://domains.google** (Google) or **https://www.cloudflare.com** (cheap,
   slightly more technical).
2. Search for the name you want, e.g. `eurobarbers.com` or
   `eurobarberscolumbus.com`.
3. Add it to cart and check out. (Usually ~$10–15/year.)
4. **🔑 COPY THIS** → Section 8 as "Domain name" (the exact address you bought)
   and "Registrar" (where you bought it).

### 5b. Connecting it
- Your developer connects the domain to Vercel and adds the email (Resend) DNS
  records. They'll either ask for **temporary access** to the registrar, or send
  you a short list of records to paste in. Either is fine.

---

## 6. Optional but nice to have

### 6a. Google Business Profile (for Maps & reviews)
1. Go to **https://www.google.com/business** and click **Manage now**.
2. Sign in with a Google account and search for "EuroBarbers" — claim it if it
   exists, or **Add your business**.
3. Enter the address (7370 Sawmill Road, Columbus, OH 43235), phone
   (614-900-6080), hours (10 AM–7 PM), and category **Barber shop**.
4. Google will verify you (by postcard, phone, or email).
- This helps you show up in Google Maps and collect reviews. It does **not**
  produce a key — just let your developer know once it's live so they can link to
  it.

### 6b. Photos
- Gather **barber photos** (headshots) and **gallery photos** (haircuts, shop
  interior). Send them to your developer. If you don't have them yet, the site
  launches with tasteful placeholder images and you can swap them in later.

---

## 7. The one-page checklist

Tick these off as you go:

- [ ] **Supabase** account + project created
- [ ] Supabase **URL**, **anon key**, **service_role key** copied to Section 8
- [ ] Decided **admin login email**
- [ ] **Resend** account created + **API key** copied
- [ ] **Twilio** account created + **SID**, **Auth Token**, **phone number**
      copied
- [ ] **Twilio A2P 10DLC** registration submitted (texting approval)
- [ ] **Vercel** account created (developer has access)
- [ ] **Domain** purchased
- [ ] (Optional) **Google Business Profile** claimed
- [ ] (Optional) **Photos** gathered
- [ ] Section 8 below filled in and handed to your developer

---

## 8. Collection sheet — fill this in and give to your developer

> Keep this private. These are the actual keys that run your business systems.
> Delete or shred this section after your developer has stored them securely in
> the hosting (Vercel) settings.

```
=== SUPABASE (database) ===
SUPABASE URL:                ____________________________________________
SUPABASE ANON KEY:           ____________________________________________
SUPABASE SERVICE ROLE KEY:   ____________________________________________
Supabase DB password:        ____________________________________________
Admin login email:           ____________________________________________

=== RESEND (emails) ===
RESEND API KEY:              ____________________________________________
Email "from" address:        ____________________________________________
   (e.g. EuroBarbers <bookings@eurobarbers.com>, or "use test address for now")

=== TWILIO (text messages) ===
TWILIO ACCOUNT SID:          ____________________________________________
TWILIO AUTH TOKEN:           ____________________________________________
TWILIO PHONE NUMBER:         ____________________________________________
A2P 10DLC status:            [ ] not started  [ ] submitted  [ ] approved

=== VERCEL (hosting) ===
Vercel account owner email:  ____________________________________________

=== DOMAIN (web address) ===
Domain name:                 ____________________________________________
Registrar (where bought):    ____________________________________________

=== BUSINESS DETAILS TO CONFIRM (from PO-REVIEW action items) ===
Real service prices/durations:    ___________________________________
Exact open days & hours:          ___________________________________
Barbers besides Elis (names/bios):___________________________________
Elis's weekly schedule/days off:  ___________________________________
```

---

### Questions?
Anything marked ⚠️ is a "keep secret" item. Anything marked 🔑 is a value to copy
into Section 8. If a screen looks different from these steps (websites change
their layout), send your developer a screenshot and they'll point you to the
right button.
