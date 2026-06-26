-- EuroBarbers — Initial schema
-- Rebuilds the database around customers / appointments / check-ins / queue,
-- per the approved requirements (decisions #1, #5, #11–#18).
-- Safe to run on a fresh Supabase Postgres database.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;     -- gen_random_uuid()
create extension if not exists btree_gist;   -- exclusion constraints (uuid =, range &&)

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------

-- Keep updated_at fresh on any table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Normalize a name for duplicate matching: trim + lowercase.
create or replace function public.normalize_name(p text)
returns text
language sql
immutable
as $$
  select lower(btrim(coalesce(p, '')));
$$;

-- Normalize a phone for duplicate matching: keep digits only.
create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(p, ''), '\D', '', 'g');
$$;

-- ---------------------------------------------------------------------------
-- shop_settings (singleton row, id = true)
-- ---------------------------------------------------------------------------
create table if not exists public.shop_settings (
  id boolean primary key default true,
  shop_name text not null default 'EuroBarbers',
  phone text,
  address text,
  city text,
  state text,
  zip text,
  timezone text not null default 'America/New_York',
  -- Booking behavior
  slot_interval_minutes integer not null default 15 check (slot_interval_minutes > 0),
  min_notice_minutes integer not null default 30 check (min_notice_minutes >= 0),
  max_days_ahead integer not null default 60 check (max_days_ahead > 0),
  -- Operations toggles
  walk_in_checkin_open boolean not null default true,
  sms_enabled boolean not null default false,          -- master SMS gate (decision #14)
  reminder_24h_enabled boolean not null default true,
  reminder_2h_enabled boolean not null default true,
  queue_sms_enabled boolean not null default true,
  -- TV lobby display token (decision #4) — never exposed publicly
  queue_display_token text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_settings_singleton check (id)
);

create trigger trg_shop_settings_updated
  before update on public.shop_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_services_updated
  before update on public.services
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- barbers
-- ---------------------------------------------------------------------------
create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  title text,
  bio text,
  image_url text,
  specialties text[] not null default '{}',
  auth_user_id uuid unique references auth.users(id) on delete set null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_barbers_updated
  before update on public.barbers
  for each row execute function public.set_updated_at();

-- Which barbers can perform which services.
create table if not exists public.barber_services (
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (barber_id, service_id)
);

-- ---------------------------------------------------------------------------
-- barber_availability (weekly working hours)
-- ---------------------------------------------------------------------------
create table if not exists public.barber_availability (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Sun .. 6=Sat
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barber_id, day_of_week, start_time, end_time),
  check (start_time < end_time)
);

create trigger trg_barber_availability_updated
  before update on public.barber_availability
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- barber_time_off
-- ---------------------------------------------------------------------------
create table if not exists public.barber_time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  reason text,
  time_range tstzrange generated always as (tstzrange(start_datetime, end_datetime, '[)')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_datetime < end_datetime)
);

create index if not exists idx_time_off_barber on public.barber_time_off (barber_id);
create index if not exists idx_time_off_range on public.barber_time_off using gist (time_range);

create trigger trg_barber_time_off_updated
  before update on public.barber_time_off
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- customers (deduplicated unique people)
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  normalized_first_name text not null,
  normalized_last_name text not null,
  normalized_phone text not null,
  sms_transactional_consent boolean not null default false,
  sms_transactional_consent_at timestamptz,
  sms_marketing_consent boolean not null default false,
  sms_marketing_consent_at timestamptz,
  sms_marketing_consent_source text,
  sms_opted_out boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_first_name, normalized_last_name, normalized_phone)
);

-- Auto-populate normalized columns + updated_at so matching is always consistent.
create or replace function public.customers_set_normalized()
returns trigger
language plpgsql
as $$
begin
  new.normalized_first_name := public.normalize_name(new.first_name);
  new.normalized_last_name  := public.normalize_name(new.last_name);
  new.normalized_phone      := public.normalize_phone(new.phone);
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_customers_normalize
  before insert or update on public.customers
  for each row execute function public.customers_set_normalized();

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  barber_id uuid not null references public.barbers(id),
  service_id uuid not null references public.services(id),
  appointment_start timestamptz not null,
  appointment_end timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'completed', 'canceled', 'no_show')),
  notes text,
  confirmation_sms_sent boolean not null default false,
  reminder_24h_sent boolean not null default false,
  reminder_2h_sent boolean not null default false,
  time_range tstzrange generated always as (tstzrange(appointment_start, appointment_end, '[)')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (appointment_start < appointment_end),
  -- Prevent double-booking the same barber. Canceled / no-show do not block.
  exclude using gist (
    barber_id with =,
    time_range with &&
  ) where (status in ('scheduled', 'confirmed', 'completed'))
);

create index if not exists idx_appointments_barber_start on public.appointments (barber_id, appointment_start);
create index if not exists idx_appointments_customer on public.appointments (customer_id);
create index if not exists idx_appointments_status on public.appointments (status);

create trigger trg_appointments_updated
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- check_ins (one row per visit — the basis for reporting)
-- ---------------------------------------------------------------------------
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  service_id uuid not null references public.services(id),
  barber_id uuid references public.barbers(id),
  preferred_barber_id uuid references public.barbers(id),
  served_by_barber_id uuid references public.barbers(id),
  appointment_id uuid references public.appointments(id),
  check_in_type text not null default 'walk_in'
    check (check_in_type in ('walk_in', 'appointment', 'manual_admin')),
  status text not null default 'waiting'
    check (status in ('waiting', 'next', 'in_chair', 'completed', 'canceled', 'no_show')),
  checked_in_at timestamptz not null default now(),
  completed_at timestamptz,
  canceled_at timestamptz,
  no_show_at timestamptz,
  estimated_wait_minutes integer,
  queue_position_at_checkin integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_check_ins_checked_in_at on public.check_ins (checked_in_at);
create index if not exists idx_check_ins_customer on public.check_ins (customer_id);
create index if not exists idx_check_ins_status on public.check_ins (status);

create trigger trg_check_ins_updated
  before update on public.check_ins
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- walk_in_queue (current active queue state)
-- ---------------------------------------------------------------------------
create table if not exists public.walk_in_queue (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  service_id uuid not null references public.services(id),
  barber_id uuid references public.barbers(id),
  preferred_barber_id uuid references public.barbers(id),
  served_by_barber_id uuid references public.barbers(id),
  position integer not null default 0,
  status text not null default 'waiting'
    check (status in ('waiting', 'next', 'in_chair', 'completed', 'canceled', 'no_show')),
  next_sms_sent boolean not null default false,
  checked_in_at timestamptz not null default now(),
  called_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_queue_status on public.walk_in_queue (status);
create index if not exists idx_queue_barber on public.walk_in_queue (barber_id);
create index if not exists idx_queue_checked_in_at on public.walk_in_queue (checked_in_at);

create trigger trg_walk_in_queue_updated
  before update on public.walk_in_queue
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sms_logs
-- ---------------------------------------------------------------------------
create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  appointment_id uuid references public.appointments(id),
  queue_id uuid references public.walk_in_queue(id),
  phone text not null,
  message text not null,
  sms_type text not null
    check (sms_type in ('booking_confirmation', 'reminder_24h', 'reminder_2h',
                        'queue_next', 'queue_almost_ready', 'manual')),
  provider text not null default 'twilio',
  provider_message_id text,
  status text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_sms_logs_customer on public.sms_logs (customer_id);
create index if not exists idx_sms_logs_type on public.sms_logs (sms_type);

-- ---------------------------------------------------------------------------
-- profiles (auth roles: admin / barber) — decision #3
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'barber' check (role in ('admin', 'barber')),
  barber_id uuid references public.barbers(id) on delete set null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers (security definer so they can read profiles under RLS).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_barber_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select barber_id from public.profiles where id = auth.uid();
$$;
