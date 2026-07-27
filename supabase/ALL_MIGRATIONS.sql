-- ===== 0001_initial_schema.sql =====

-- EuroBarbers â€” Initial schema
-- Rebuilds the database around customers / appointments / check-ins / queue,
-- per the approved requirements (decisions #1, #5, #11â€“#18).
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
  -- TV lobby display token (decision #4) â€” never exposed publicly
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
-- check_ins (one row per visit â€” the basis for reporting)
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
-- profiles (auth roles: admin / barber) â€” decision #3
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



-- ===== 0002_functions_and_rls.sql =====

-- EuroBarbers â€” Functions, views, and Row Level Security
-- Depends on 0001_initial_schema.sql.

-- ===========================================================================
-- Booking: available slots
-- ===========================================================================
-- Returns available appointment start times (timestamptz) for a service on a
-- date. If p_barber_id is null, returns any time at least one qualified active
-- barber is free. Honors barber working hours, time off, existing appointments
-- (scheduled/confirmed/completed), the full service duration, and min notice.
create or replace function public.get_available_slots(
  p_service_id text,
  p_barber_id text,
  p_date date
)
returns setof timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_interval integer;
  v_min_notice integer;
  v_service services%rowtype;
  v_total_minutes integer;
  v_dow integer;
  v_barber record;
  v_avail record;
  v_slot_time time;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_now timestamptz := now();
begin
  select timezone, slot_interval_minutes, min_notice_minutes
    into v_tz, v_interval, v_min_notice
  from public.shop_settings where id = true;

  v_tz := coalesce(v_tz, 'America/New_York');
  v_interval := coalesce(v_interval, 15);
  v_min_notice := coalesce(v_min_notice, 30);

  select * into v_service
  from public.services
  where is_active = true and (id::text = p_service_id or slug = p_service_id)
  limit 1;
  if not found then
    return;
  end if;

  v_total_minutes := v_service.duration_minutes + v_service.buffer_after_minutes;
  v_dow := extract(dow from p_date);

  for v_barber in
    select b.id
    from public.barbers b
    join public.barber_services bs on bs.barber_id = b.id and bs.service_id = v_service.id
    where b.is_active = true
      and (p_barber_id is null or b.id::text = p_barber_id or b.slug = p_barber_id)
  loop
    for v_avail in
      select start_time, end_time
      from public.barber_availability
      where barber_id = v_barber.id
        and day_of_week = v_dow
        and is_available = true
    loop
      v_slot_time := v_avail.start_time;
      while (v_slot_time + make_interval(mins => v_total_minutes)) <= v_avail.end_time loop
        v_slot_start := (p_date + v_slot_time) at time zone v_tz;
        v_slot_end := v_slot_start + make_interval(mins => v_total_minutes);

        if v_slot_start >= v_now + make_interval(mins => v_min_notice)
          and not exists (
            select 1 from public.appointments a
            where a.barber_id = v_barber.id
              and a.status in ('scheduled', 'confirmed', 'completed')
              and a.time_range && tstzrange(v_slot_start, v_slot_end, '[)')
          )
          and not exists (
            select 1 from public.barber_time_off t
            where t.barber_id = v_barber.id
              and t.time_range && tstzrange(v_slot_start, v_slot_end, '[)')
          )
        then
          return next v_slot_start;
        end if;

        v_slot_time := v_slot_time + make_interval(mins => v_interval);
      end loop;
    end loop;
  end loop;

  return;
end;
$$;

-- ===========================================================================
-- Internal: find or create a customer (deduplicated) + refresh consent/contact
-- ===========================================================================
create or replace function public.upsert_customer(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_transactional_consent boolean,
  p_marketing_consent boolean,
  p_marketing_source text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.customers
  where normalized_first_name = public.normalize_name(p_first_name)
    and normalized_last_name = public.normalize_name(p_last_name)
    and normalized_phone = public.normalize_phone(p_phone)
  limit 1;

  if v_id is null then
    insert into public.customers (
      first_name, last_name, phone, email,
      sms_transactional_consent, sms_transactional_consent_at,
      sms_marketing_consent, sms_marketing_consent_at, sms_marketing_consent_source,
      last_seen_at
    )
    values (
      btrim(p_first_name), btrim(p_last_name), btrim(p_phone), nullif(btrim(coalesce(p_email, '')), ''),
      coalesce(p_transactional_consent, false),
      case when p_transactional_consent then now() end,
      coalesce(p_marketing_consent, false),
      case when p_marketing_consent then now() end,
      case when p_marketing_consent then p_marketing_source end,
      now()
    )
    returning id into v_id;
  else
    update public.customers set
      email = coalesce(nullif(btrim(coalesce(p_email, '')), ''), email),
      sms_transactional_consent = sms_transactional_consent or coalesce(p_transactional_consent, false),
      sms_transactional_consent_at = case
        when p_transactional_consent and sms_transactional_consent_at is null then now()
        else sms_transactional_consent_at end,
      sms_marketing_consent = case when p_marketing_consent then true else sms_marketing_consent end,
      sms_marketing_consent_at = case
        when p_marketing_consent and sms_marketing_consent_at is null then now()
        else sms_marketing_consent_at end,
      sms_marketing_consent_source = case
        when p_marketing_consent and sms_marketing_consent_source is null then p_marketing_source
        else sms_marketing_consent_source end,
      last_seen_at = now()
    where id = v_id;
  end if;

  return v_id;
end;
$$;

-- ===========================================================================
-- Booking: create an appointment
-- ===========================================================================
create or replace function public.create_appointment(
  p_service_id text,
  p_barber_id text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_starts_at timestamptz,
  p_transactional_consent boolean default true,
  p_marketing_consent boolean default false,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service services%rowtype;
  v_barber barbers%rowtype;
  v_tz text;
  v_min_notice integer;
  v_total_minutes integer;
  v_ends_at timestamptz;
  v_dow integer;
  v_customer_id uuid;
  v_appt appointments%rowtype;
begin
  select timezone, min_notice_minutes into v_tz, v_min_notice
  from public.shop_settings where id = true;
  v_tz := coalesce(v_tz, 'America/New_York');
  v_min_notice := coalesce(v_min_notice, 30);

  select * into v_service
  from public.services
  where is_active = true and (id::text = p_service_id or slug = p_service_id)
  limit 1;
  if not found then
    raise exception 'SERVICE_UNAVAILABLE';
  end if;

  v_total_minutes := v_service.duration_minutes + v_service.buffer_after_minutes;
  v_ends_at := p_starts_at + make_interval(mins => v_total_minutes);
  v_dow := extract(dow from (p_starts_at at time zone v_tz));

  if p_starts_at < now() + make_interval(mins => v_min_notice) then
    raise exception 'TOO_SOON';
  end if;

  -- Resolve barber: specific, or first available for this service/time.
  if p_barber_id is not null then
    select b.* into v_barber
    from public.barbers b
    join public.barber_services bs on bs.barber_id = b.id and bs.service_id = v_service.id
    where b.is_active = true and (b.id::text = p_barber_id or b.slug = p_barber_id)
    limit 1;
    if not found then
      raise exception 'BARBER_UNAVAILABLE';
    end if;
  else
    select b.* into v_barber
    from public.barbers b
    join public.barber_services bs on bs.barber_id = b.id and bs.service_id = v_service.id
    where b.is_active = true
      and exists (
        select 1 from public.barber_availability a
        where a.barber_id = b.id and a.day_of_week = v_dow and a.is_available = true
          and (p_starts_at at time zone v_tz)::time >= a.start_time
          and (v_ends_at at time zone v_tz)::time <= a.end_time
      )
      and not exists (
        select 1 from public.barber_time_off t
        where t.barber_id = b.id and t.time_range && tstzrange(p_starts_at, v_ends_at, '[)')
      )
      and not exists (
        select 1 from public.appointments a
        where a.barber_id = b.id and a.status in ('scheduled', 'confirmed', 'completed')
          and a.time_range && tstzrange(p_starts_at, v_ends_at, '[)')
      )
    order by b.sort_order, b.name
    limit 1;
    if not found then
      raise exception 'NO_BARBER_AVAILABLE';
    end if;
  end if;

  -- Working hours: full service must fit inside the barber's window (decision #12).
  if not exists (
    select 1 from public.barber_availability a
    where a.barber_id = v_barber.id and a.day_of_week = v_dow and a.is_available = true
      and (p_starts_at at time zone v_tz)::time >= a.start_time
      and (v_ends_at at time zone v_tz)::time <= a.end_time
  ) then
    raise exception 'OUTSIDE_HOURS';
  end if;

  if exists (
    select 1 from public.barber_time_off t
    where t.barber_id = v_barber.id and t.time_range && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'BARBER_OFF';
  end if;

  v_customer_id := public.upsert_customer(
    p_first_name, p_last_name, p_phone, p_email,
    p_transactional_consent, p_marketing_consent, 'booking_page'
  );

  begin
    insert into public.appointments (
      customer_id, barber_id, service_id, appointment_start, appointment_end, status, notes
    )
    values (
      v_customer_id, v_barber.id, v_service.id, p_starts_at, v_ends_at, 'confirmed', p_notes
    )
    returning * into v_appt;
  exception when exclusion_violation then
    raise exception 'SLOT_TAKEN';
  end;

  return jsonb_build_object(
    'id', v_appt.id,
    'service_name', v_service.name,
    'barber_name', v_barber.name,
    'barber_slug', v_barber.slug,
    'starts_at', v_appt.appointment_start,
    'ends_at', v_appt.appointment_end,
    'status', v_appt.status
  );
end;
$$;

-- ===========================================================================
-- Walk-in: recalculate queue positions for the current day
-- ===========================================================================
create or replace function public.recalc_queue_positions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text;
begin
  select timezone into v_tz from public.shop_settings where id = true;
  v_tz := coalesce(v_tz, 'America/New_York');

  with ordered as (
    select id, row_number() over (order by checked_in_at) as rn
    from public.walk_in_queue
    where status in ('waiting', 'next', 'in_chair')
      and (checked_in_at at time zone v_tz)::date = (now() at time zone v_tz)::date
  )
  update public.walk_in_queue q
  set position = ordered.rn
  from ordered
  where q.id = ordered.id;
end;
$$;

-- ===========================================================================
-- Walk-in: join the queue (dedup + active-duplicate prevention, decisions #9,#18)
-- ===========================================================================
create or replace function public.join_walk_in_queue(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_service_id text,
  p_preferred_barber_id text,
  p_transactional_consent boolean,
  p_marketing_consent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open boolean;
  v_tz text;
  v_today date;
  v_service services%rowtype;
  v_barber_id uuid;
  v_customer_id uuid;
  v_existing record;
  v_check_in_id uuid;
  v_queue_id uuid;
  v_position integer;
begin
  select walk_in_checkin_open, timezone into v_open, v_tz
  from public.shop_settings where id = true;
  v_tz := coalesce(v_tz, 'America/New_York');

  if coalesce(v_open, true) = false then
    raise exception 'WALK_IN_CLOSED';
  end if;

  if not coalesce(p_transactional_consent, false) then
    raise exception 'CONSENT_REQUIRED';
  end if;

  select * into v_service
  from public.services
  where is_active = true and (id::text = p_service_id or slug = p_service_id)
  limit 1;
  if not found then
    raise exception 'SERVICE_UNAVAILABLE';
  end if;

  if p_preferred_barber_id is not null and p_preferred_barber_id <> '' and p_preferred_barber_id <> 'any' then
    select id into v_barber_id from public.barbers
    where is_active = true and (id::text = p_preferred_barber_id or slug = p_preferred_barber_id)
    limit 1;
  else
    v_barber_id := null; -- First Available
  end if;

  v_customer_id := public.upsert_customer(
    p_first_name, p_last_name, p_phone, p_email,
    p_transactional_consent, p_marketing_consent, 'walk_in_check_in'
  );

  v_today := (now() at time zone v_tz)::date;

  -- Active-queue duplicate prevention (decision #18).
  select id, position into v_existing
  from public.walk_in_queue
  where customer_id = v_customer_id
    and status in ('waiting', 'next', 'in_chair')
    and (checked_in_at at time zone v_tz)::date = v_today
  order by checked_in_at
  limit 1;

  if found then
    return jsonb_build_object(
      'already_in_queue', true,
      'queue_id', v_existing.id,
      'position', v_existing.position,
      'customer_id', v_customer_id
    );
  end if;

  select coalesce(max(position), 0) + 1 into v_position
  from public.walk_in_queue
  where status in ('waiting', 'next', 'in_chair')
    and (checked_in_at at time zone v_tz)::date = v_today;

  insert into public.check_ins (
    customer_id, service_id, barber_id, preferred_barber_id,
    check_in_type, status, queue_position_at_checkin
  )
  values (
    v_customer_id, v_service.id, v_barber_id, v_barber_id,
    'walk_in', 'waiting', v_position
  )
  returning id into v_check_in_id;

  insert into public.walk_in_queue (
    customer_id, check_in_id, service_id, barber_id, preferred_barber_id, position, status
  )
  values (
    v_customer_id, v_check_in_id, v_service.id, v_barber_id, v_barber_id, v_position, 'waiting'
  )
  returning id into v_queue_id;

  return jsonb_build_object(
    'already_in_queue', false,
    'queue_id', v_queue_id,
    'check_in_id', v_check_in_id,
    'position', v_position,
    'customer_id', v_customer_id
  );
end;
$$;

-- ===========================================================================
-- Queue: update a walk-in's status (syncs check_ins + recalculates positions)
-- ===========================================================================
create or replace function public.update_walk_in_status(
  p_queue_id uuid,
  p_status text,
  p_served_by_barber_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q walk_in_queue%rowtype;
  v_served uuid;
begin
  if p_status not in ('waiting', 'next', 'in_chair', 'completed', 'canceled', 'no_show') then
    raise exception 'INVALID_STATUS';
  end if;

  select * into v_q from public.walk_in_queue where id = p_queue_id;
  if not found then
    raise exception 'QUEUE_ITEM_NOT_FOUND';
  end if;

  -- Authorization: admins, or a barber acting on their own / First Available item.
  if not (
    public.is_admin()
    or public.current_barber_id() is null  -- service-role context (auth.uid() null)
    or v_q.barber_id is null
    or v_q.barber_id = public.current_barber_id()
    or v_q.preferred_barber_id = public.current_barber_id()
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  v_served := coalesce(p_served_by_barber_id, v_q.served_by_barber_id);
  if p_status = 'in_chair' and v_served is null then
    v_served := public.current_barber_id();
  end if;

  update public.walk_in_queue set
    status = p_status,
    served_by_barber_id = v_served,
    barber_id = coalesce(v_served, barber_id),
    called_at = case when p_status = 'next' and called_at is null then now() else called_at end,
    started_at = case when p_status = 'in_chair' and started_at is null then now() else started_at end,
    completed_at = case when p_status = 'completed' then now() else completed_at end
  where id = p_queue_id
  returning * into v_q;

  update public.check_ins set
    status = p_status,
    served_by_barber_id = coalesce(v_served, served_by_barber_id),
    barber_id = coalesce(v_served, barber_id),
    completed_at = case when p_status = 'completed' then now() else completed_at end,
    canceled_at = case when p_status = 'canceled' then now() else canceled_at end,
    no_show_at = case when p_status = 'no_show' then now() else no_show_at end
  where id = v_q.check_in_id;

  perform public.recalc_queue_positions();

  return jsonb_build_object(
    'id', v_q.id,
    'status', v_q.status,
    'served_by_barber_id', v_q.served_by_barber_id,
    'next_sms_sent', v_q.next_sms_sent
  );
end;
$$;

-- ===========================================================================
-- Queue: take next customer for a barber (decision: assigned first, then First Available)
-- ===========================================================================
create or replace function public.take_next_customer(p_barber_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_today date;
  v_queue_id uuid;
begin
  if not (public.is_admin() or public.current_barber_id() is null or public.current_barber_id() = p_barber_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select timezone into v_tz from public.shop_settings where id = true;
  v_tz := coalesce(v_tz, 'America/New_York');
  v_today := (now() at time zone v_tz)::date;

  -- 1) earliest waiting assigned to this barber
  select id into v_queue_id
  from public.walk_in_queue
  where status = 'waiting'
    and (checked_in_at at time zone v_tz)::date = v_today
    and (barber_id = p_barber_id or preferred_barber_id = p_barber_id)
  order by position, checked_in_at
  limit 1;

  -- 2) otherwise earliest waiting First Available
  if v_queue_id is null then
    select id into v_queue_id
    from public.walk_in_queue
    where status = 'waiting'
      and (checked_in_at at time zone v_tz)::date = v_today
      and preferred_barber_id is null
    order by position, checked_in_at
    limit 1;
  end if;

  if v_queue_id is null then
    return jsonb_build_object('found', false);
  end if;

  -- Mark as "next" and assign this barber so the queue-next SMS can be sent.
  return (public.update_walk_in_status(v_queue_id, 'next', p_barber_id)) || jsonb_build_object('found', true);
end;
$$;

-- ===========================================================================
-- Public-safe shop info (no display token)
-- ===========================================================================
create or replace function public.get_shop_public()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'shop_name', shop_name,
    'phone', phone,
    'address', address,
    'city', city,
    'state', state,
    'zip', zip,
    'timezone', timezone,
    'walk_in_checkin_open', walk_in_checkin_open
  )
  from public.shop_settings where id = true;
$$;

-- ===========================================================================
-- Lobby display view (safe â€” first name + last initial only)
-- ===========================================================================
create or replace view public.lobby_queue_view as
select
  q.id,
  q.status,
  q.position,
  c.first_name,
  left(c.last_name, 1) as last_initial,
  coalesce(sb.name, pb.name) as barber_name,
  (q.preferred_barber_id is null) as first_available,
  s.name as service_name,
  q.checked_in_at
from public.walk_in_queue q
join public.customers c on c.id = q.customer_id
join public.services s on s.id = q.service_id
left join public.barbers sb on sb.id = q.served_by_barber_id
left join public.barbers pb on pb.id = q.preferred_barber_id
where q.status in ('waiting', 'next', 'in_chair');

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.shop_settings enable row level security;
alter table public.services enable row level security;
alter table public.barbers enable row level security;
alter table public.barber_services enable row level security;
alter table public.barber_availability enable row level security;
alter table public.barber_time_off enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.check_ins enable row level security;
alter table public.walk_in_queue enable row level security;
alter table public.sms_logs enable row level security;
alter table public.profiles enable row level security;

-- Public, read-only catalog (anon may read for the website).
create policy services_read on public.services for select using (true);
create policy services_admin on public.services for all using (public.is_admin()) with check (public.is_admin());

create policy barbers_read on public.barbers for select using (true);
create policy barbers_admin on public.barbers for all using (public.is_admin()) with check (public.is_admin());

create policy barber_services_read on public.barber_services for select using (true);
create policy barber_services_admin on public.barber_services for all using (public.is_admin()) with check (public.is_admin());

create policy barber_availability_read on public.barber_availability for select using (true);
create policy barber_availability_admin on public.barber_availability for all using (public.is_admin()) with check (public.is_admin());

-- Staff-only tables. Anon never reads these; public writes happen via SECURITY
-- DEFINER RPCs using the service role. Barber-scoped reads/actions use the
-- definer functions above.
create policy shop_settings_admin on public.shop_settings for all using (public.is_admin()) with check (public.is_admin());

create policy time_off_admin on public.barber_time_off for all using (public.is_admin()) with check (public.is_admin());
create policy time_off_barber_read on public.barber_time_off for select using (barber_id = public.current_barber_id());

create policy customers_admin on public.customers for all using (public.is_admin()) with check (public.is_admin());

create policy appointments_admin on public.appointments for all using (public.is_admin()) with check (public.is_admin());
create policy appointments_barber_read on public.appointments for select using (barber_id = public.current_barber_id());

create policy check_ins_admin on public.check_ins for all using (public.is_admin()) with check (public.is_admin());
create policy check_ins_barber_read on public.check_ins for select
  using (barber_id = public.current_barber_id() or preferred_barber_id = public.current_barber_id() or barber_id is null);

create policy queue_admin on public.walk_in_queue for all using (public.is_admin()) with check (public.is_admin());
create policy queue_barber_read on public.walk_in_queue for select
  using (barber_id = public.current_barber_id() or preferred_barber_id = public.current_barber_id() or barber_id is null);

create policy sms_logs_admin on public.sms_logs for all using (public.is_admin()) with check (public.is_admin());

create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_admin_write on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- Function privileges
-- ===========================================================================
grant execute on function public.get_available_slots(text, text, date) to anon, authenticated;
grant execute on function public.get_shop_public() to anon, authenticated;
-- Sensitive mutations are invoked server-side with the service role; granting to
-- authenticated lets the admin/barber dashboards call them under their session.
grant execute on function public.create_appointment(text, text, text, text, text, text, timestamptz, boolean, boolean, text) to authenticated;
grant execute on function public.join_walk_in_queue(text, text, text, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.update_walk_in_status(uuid, text, uuid) to authenticated;
grant execute on function public.take_next_customer(uuid) to authenticated;



-- ===== 0003_seed.sql =====

-- EuroBarbers â€” Seed data (placeholder values; editable in admin).
-- Decisions #6 (single location), #7 (Elis real + placeholders), #8 (placeholder prices).

-- Shop settings (singleton)
insert into public.shop_settings (id, shop_name, phone, address, city, state, zip)
values (true, 'EuroBarbers', '614-900-6080', '7370 Sawmill Road', 'Columbus', 'OH', '43235')
on conflict (id) do nothing;

-- Services (placeholder prices & durations)
insert into public.services (slug, name, description, price_cents, duration_minutes, buffer_after_minutes, sort_order)
values
  ('mens-haircut',   'Men''s Haircut',   'Consultation, precision cut, and clean finish.',            3500, 30, 5,  1),
  ('skin-fade',      'Skin Fade',        'Tight skin fade with razor detailing and styling.',         4000, 45, 10, 2),
  ('beard-trim',     'Beard Trim',       'Beard shape-up, line-up, and conditioning.',                2000, 20, 5,  3),
  ('haircut-beard',  'Haircut + Beard',  'Full haircut paired with a tailored beard sculpt.',         5000, 50, 10, 4),
  ('kids-haircut',   'Kids Haircut',     'Patient, friendly cuts for younger clients.',               2500, 30, 5,  5),
  ('hot-towel-shave','Hot Towel Shave',  'Traditional hot towel straight-razor shave.',               3500, 30, 5,  6),
  ('lineup',         'Lineup',           'Crisp hairline and edge-up.',                               1500, 15, 5,  7)
on conflict (slug) do nothing;

-- Barbers: Elis is the only confirmed barber; the others are placeholders.
insert into public.barbers (slug, name, title, bio, specialties, is_active, sort_order)
values
  ('elis',  'Elis',          'Master Barber',  'EuroBarbers'' founding master barber, known for precision fades and classic European styling.', array['Skin fades','Classic cuts','Beard sculpting'], true, 1),
  ('barber-two', 'Barber Two', 'Barber',        'Placeholder profile â€” update in the admin dashboard.', array['Fades','Line-ups'], true, 2),
  ('barber-three','Barber Three','Barber',       'Placeholder profile â€” update in the admin dashboard.', array['Beards','Tapers'], true, 3)
on conflict (slug) do nothing;

-- Every barber can perform every service (adjust later in admin).
insert into public.barber_services (barber_id, service_id)
select b.id, s.id from public.barbers b cross join public.services s
on conflict do nothing;

-- Weekly availability: open 10:00â€“19:00 every day (placeholder; adjust per barber).
insert into public.barber_availability (barber_id, day_of_week, start_time, end_time, is_available)
select b.id, d.dow, time '10:00', time '19:00', true
from public.barbers b
cross join generate_series(0, 6) as d(dow)
on conflict (barber_id, day_of_week, start_time, end_time) do nothing;



-- ===== 0004_queue_views_and_realtime.sql =====

-- EuroBarbers â€” Migration 0004
-- Staff/lobby queue read functions (privacy-scoped) + realtime publication.
-- Barbers cannot read public.customers directly under RLS, so queue listings
-- for staff and the lobby TV are exposed through SECURITY DEFINER functions
-- that return only the fields each audience is allowed to see.

-- ---------------------------------------------------------------------------
-- Staff queue: admins see all of today's active queue (incl. phone); barbers
-- see only their own + First Available items, without phone numbers.
-- ---------------------------------------------------------------------------
create or replace function public.get_staff_queue()
returns table (
  id uuid,
  status text,
  "position" integer,
  first_name text,
  last_initial text,
  phone text,
  service_name text,
  preferred_barber_name text,
  served_by_name text,
  first_available boolean,
  checked_in_at timestamptz,
  next_sms_sent boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_today date;
  v_is_admin boolean;
  v_barber uuid;
begin
  v_is_admin := public.is_admin();
  v_barber := public.current_barber_id();

  if not (v_is_admin or v_barber is not null) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select timezone into v_tz from public.shop_settings where shop_settings.id = true;
  v_tz := coalesce(v_tz, 'America/New_York');
  v_today := (now() at time zone v_tz)::date;

  return query
  select
    q.id,
    q.status,
    q.position,
    c.first_name,
    left(c.last_name, 1) as last_initial,
    case when v_is_admin then c.phone else null end as phone,
    s.name as service_name,
    pb.name as preferred_barber_name,
    sb.name as served_by_name,
    (q.preferred_barber_id is null) as first_available,
    q.checked_in_at,
    q.next_sms_sent
  from public.walk_in_queue q
  join public.customers c on c.id = q.customer_id
  join public.services s on s.id = q.service_id
  left join public.barbers pb on pb.id = q.preferred_barber_id
  left join public.barbers sb on sb.id = q.served_by_barber_id
  where q.status in ('waiting', 'next', 'in_chair')
    and (q.checked_in_at at time zone v_tz)::date = v_today
    and (
      v_is_admin
      or q.barber_id = v_barber
      or q.preferred_barber_id = v_barber
      or q.barber_id is null
    )
  order by q.position, q.checked_in_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lobby TV queue: token-gated, public-safe (first name + last initial only).
-- ---------------------------------------------------------------------------
create or replace function public.get_lobby_queue(p_token text)
returns table (
  id uuid,
  status text,
  "position" integer,
  first_name text,
  last_initial text,
  barber_name text,
  first_available boolean,
  service_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_token text;
  v_tz text;
  v_today date;
begin
  select queue_display_token, timezone into v_token, v_tz
  from public.shop_settings where shop_settings.id = true;

  if p_token is null or v_token is null or p_token <> v_token then
    raise exception 'INVALID_TOKEN';
  end if;

  v_tz := coalesce(v_tz, 'America/New_York');
  v_today := (now() at time zone v_tz)::date;

  return query
  select
    q.id,
    q.status,
    q.position,
    c.first_name,
    left(c.last_name, 1) as last_initial,
    coalesce(sb.name, pb.name) as barber_name,
    (q.preferred_barber_id is null) as first_available,
    s.name as service_name
  from public.walk_in_queue q
  join public.customers c on c.id = q.customer_id
  join public.services s on s.id = q.service_id
  left join public.barbers sb on sb.id = q.served_by_barber_id
  left join public.barbers pb on pb.id = q.preferred_barber_id
  where q.status in ('waiting', 'next', 'in_chair')
    and (q.checked_in_at at time zone v_tz)::date = v_today
  order by q.position, q.checked_in_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff appointments for a given day, privacy-scoped by role.
-- Admins see all (incl. phone); barbers see only their own (no phone).
-- ---------------------------------------------------------------------------
create or replace function public.get_staff_appointments(p_date date default null)
returns table (
  id uuid,
  status text,
  appointment_start timestamptz,
  appointment_end timestamptz,
  first_name text,
  last_initial text,
  phone text,
  service_name text,
  barber_name text,
  notes text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_day date;
  v_is_admin boolean;
  v_barber uuid;
begin
  v_is_admin := public.is_admin();
  v_barber := public.current_barber_id();

  if not (v_is_admin or v_barber is not null) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select timezone into v_tz from public.shop_settings where shop_settings.id = true;
  v_tz := coalesce(v_tz, 'America/New_York');
  v_day := coalesce(p_date, (now() at time zone v_tz)::date);

  return query
  select
    a.id,
    a.status,
    a.appointment_start,
    a.appointment_end,
    c.first_name,
    left(c.last_name, 1) as last_initial,
    case when v_is_admin then c.phone else null end as phone,
    s.name as service_name,
    b.name as barber_name,
    a.notes
  from public.appointments a
  join public.customers c on c.id = a.customer_id
  join public.services s on s.id = a.service_id
  join public.barbers b on b.id = a.barber_id
  where (a.appointment_start at time zone v_tz)::date = v_day
    and (v_is_admin or a.barber_id = v_barber)
  order by a.appointment_start;
end;
$$;

grant execute on function public.get_staff_queue() to authenticated;
grant execute on function public.get_lobby_queue(text) to anon, authenticated;
grant execute on function public.get_staff_appointments(date) to authenticated;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'walk_in_queue'
  ) then
    alter publication supabase_realtime add table public.walk_in_queue;
  end if;
exception
  when undefined_object then
    -- supabase_realtime publication not present (e.g. plain Postgres); skip.
    null;
end;
$$;



-- ===== 0005_reports.sql =====

-- EuroBarbers â€” Migration 0005
-- Admin reporting aggregates (admin-only, privacy-safe counts).

create or replace function public.get_admin_reports(
  p_start date default null,
  p_end date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_start date;
  v_end date;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select timezone into v_tz from public.shop_settings where id = true;
  v_tz := coalesce(v_tz, 'America/New_York');
  v_end := coalesce(p_end, (now() at time zone v_tz)::date);
  v_start := coalesce(p_start, v_end - 29);

  with ci as (
    select
      c.*,
      (c.checked_in_at at time zone v_tz) as local_ts
    from public.check_ins c
    where (c.checked_in_at at time zone v_tz)::date between v_start and v_end
  )
  select jsonb_build_object(
    'start', v_start,
    'end', v_end,
    'total_check_ins', (select count(*) from ci),
    'completed', (select count(*) from ci where status = 'completed'),
    'no_show', (select count(*) from ci where status = 'no_show'),
    'canceled', (select count(*) from ci where status = 'canceled'),
    'total_appointments', (
      select count(*) from public.appointments a
      where (a.appointment_start at time zone v_tz)::date between v_start and v_end
    ),
    'unique_customers', (select count(distinct customer_id) from ci),
    'returning_customers', (
      select count(*) from (
        select customer_id from ci group by customer_id having count(*) > 1
      ) r
    ),
    'by_dow', (
      select coalesce(jsonb_object_agg(dow::text, cnt), '{}'::jsonb)
      from (
        select extract(dow from local_ts)::int as dow, count(*) as cnt
        from ci group by 1
      ) t
    ),
    'by_hour', (
      select coalesce(jsonb_object_agg(hr::text, cnt), '{}'::jsonb)
      from (
        select extract(hour from local_ts)::int as hr, count(*) as cnt
        from ci group by 1
      ) t
    ),
    'by_barber', (
      select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select coalesce(b.name, 'First Available / Unassigned') as name, count(*) as cnt
        from ci
        left join public.barbers b on b.id = ci.served_by_barber_id
        group by 1
      ) t
    ),
    'by_service', (
      select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select s.name as name, count(*) as cnt
        from ci
        join public.services s on s.id = ci.service_id
        group by 1
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_admin_reports(date, date) to authenticated;



-- ===== 0006_schedule_management.sql =====

-- EuroBarbers â€” Migration 0006
-- Admin schedule management: weekly availability + time off, via SECURITY
-- DEFINER functions that enforce admin-only access and compute timestamps in
-- the shop timezone (DST-safe). The booking engine (get_available_slots) and
-- create_appointment already honor barber_availability + barber_time_off, so
-- changes made here take effect immediately for online booking.

-- ---------------------------------------------------------------------------
-- Set (replace) a barber's working window for one weekday.
--   p_day: 0 = Sunday .. 6 = Saturday
--   p_is_working = false  -> barber is OFF that weekday (no bookable hours)
--   p_is_working = true   -> single window p_start..p_end (e.g. '10:00'..'19:00')
-- We model one window per weekday: delete existing rows for that day, then
-- insert the new window when working.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_barber_day(
  p_barber_id uuid,
  p_day integer,
  p_is_working boolean,
  p_start text,
  p_end text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start time;
  v_end time;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_day is null or p_day < 0 or p_day > 6 then
    raise exception 'INVALID_DAY';
  end if;

  delete from public.barber_availability
  where barber_id = p_barber_id and day_of_week = p_day;

  if coalesce(p_is_working, false) then
    v_start := nullif(btrim(coalesce(p_start, '')), '')::time;
    v_end   := nullif(btrim(coalesce(p_end, '')), '')::time;

    if v_start is null or v_end is null then
      raise exception 'HOURS_REQUIRED';
    end if;
    if v_start >= v_end then
      raise exception 'INVALID_HOURS';
    end if;

    insert into public.barber_availability (barber_id, day_of_week, start_time, end_time, is_available)
    values (p_barber_id, p_day, v_start, v_end, true);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Add a time-off block for a barber (full day(s) or a partial window).
--   p_all_day = true  -> blocks whole day(s) from p_start_date through p_end_date
--   p_all_day = false -> blocks p_start_time..p_end_time on the date range
-- Timestamps are computed in the shop timezone so DST is handled correctly.
-- Returns the new time-off row id.
-- ---------------------------------------------------------------------------
create or replace function public.admin_add_time_off(
  p_barber_id uuid,
  p_start_date text,
  p_end_date text,
  p_all_day boolean,
  p_start_time text,
  p_end_time text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_start_date date;
  v_end_date date;
  v_start timestamptz;
  v_end timestamptz;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not exists (select 1 from public.barbers where id = p_barber_id) then
    raise exception 'BARBER_NOT_FOUND';
  end if;

  select ss.timezone into v_tz from public.shop_settings ss where ss.id = true;
  v_tz := coalesce(v_tz, 'America/New_York');

  v_start_date := nullif(btrim(coalesce(p_start_date, '')), '')::date;
  v_end_date   := coalesce(nullif(btrim(coalesce(p_end_date, '')), '')::date, v_start_date);

  if v_start_date is null then
    raise exception 'START_DATE_REQUIRED';
  end if;
  if v_end_date < v_start_date then
    raise exception 'INVALID_DATE_RANGE';
  end if;

  if coalesce(p_all_day, true) then
    -- Whole days: from midnight of the first day to midnight after the last day.
    v_start := (v_start_date::timestamp) at time zone v_tz;
    v_end   := ((v_end_date + 1)::timestamp) at time zone v_tz;
  else
    v_start := (v_start_date + nullif(btrim(coalesce(p_start_time, '')), '')::time) at time zone v_tz;
    v_end   := (v_end_date   + nullif(btrim(coalesce(p_end_time, '')), '')::time) at time zone v_tz;
    if v_start is null or v_end is null then
      raise exception 'TIMES_REQUIRED';
    end if;
  end if;

  if v_start >= v_end then
    raise exception 'INVALID_RANGE';
  end if;

  insert into public.barber_time_off (barber_id, start_datetime, end_datetime, reason)
  values (p_barber_id, v_start, v_end, nullif(btrim(coalesce(p_reason, '')), ''))
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Remove a time-off block.
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_time_off(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  delete from public.barber_time_off where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Activate / deactivate a barber (deactivated barbers disappear from booking,
-- check-in, and the public site).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_barber_active(
  p_barber_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  update public.barbers set is_active = coalesce(p_active, false) where id = p_barber_id;
end;
$$;

grant execute on function public.admin_set_barber_day(uuid, integer, boolean, text, text) to authenticated;
grant execute on function public.admin_add_time_off(uuid, text, text, boolean, text, text, text) to authenticated;
grant execute on function public.admin_delete_time_off(uuid) to authenticated;
grant execute on function public.admin_set_barber_active(uuid, boolean) to authenticated;



-- ===== 0007_service_management.sql =====

-- EuroBarbers â€” Migration 0007
-- Admin-only service management RPCs (create / update). SECURITY DEFINER so the
-- admin dashboard can edit services without relying on table-level RLS.

create or replace function public.admin_update_service(
  p_id uuid,
  p_name text,
  p_price_cents integer,
  p_duration integer,
  p_buffer integer,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_duration is null or p_duration <= 0 then
    raise exception 'DURATION_REQUIRED';
  end if;
  if coalesce(p_price_cents, 0) < 0 then
    raise exception 'PRICE_INVALID';
  end if;

  update public.services set
    name = coalesce(nullif(btrim(p_name), ''), name),
    price_cents = greatest(coalesce(p_price_cents, 0), 0),
    duration_minutes = p_duration,
    buffer_after_minutes = greatest(coalesce(p_buffer, 0), 0),
    is_active = coalesce(p_is_active, is_active)
  where id = p_id;
end;
$$;

create or replace function public.admin_create_service(
  p_name text,
  p_price_cents integer,
  p_duration integer,
  p_buffer integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_i integer := 1;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'NAME_REQUIRED';
  end if;
  if p_duration is null or p_duration <= 0 then
    raise exception 'DURATION_REQUIRED';
  end if;

  v_base := btrim(regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g'), '-');
  if v_base = '' then
    v_base := 'service';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.services where slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i;
  end loop;

  insert into public.services (
    slug, name, price_cents, duration_minutes, buffer_after_minutes, is_active, sort_order
  )
  values (
    v_slug, btrim(p_name), greatest(coalesce(p_price_cents, 0), 0),
    p_duration, greatest(coalesce(p_buffer, 0), 0), true,
    coalesce((select max(sort_order) from public.services), 0) + 1
  )
  returning id into v_id;

  -- Let every barber perform the new service by default.
  insert into public.barber_services (barber_id, service_id)
  select b.id, v_id from public.barbers b
  on conflict do nothing;

  return v_id;
end;
$$;

grant execute on function public.admin_update_service(uuid, text, integer, integer, integer, boolean) to authenticated;
grant execute on function public.admin_create_service(text, integer, integer, integer) to authenticated;



-- ===== 0008_barber_and_service_management.sql =====

-- EuroBarbers â€” Migration 0008
-- Admin-only service delete + full barber management (create / update / delete).
-- SECURITY DEFINER, enforce is_admin(). Friendly errors when a row still has
-- history (foreign keys) so the UI can suggest deactivating instead.

-- ---------------------------------------------------------------------------
-- Delete a service. Join rows (barber_services) are removed first. If the
-- service still has appointments / check-ins / queue history, the delete is
-- blocked and SERVICE_IN_USE is raised so the UI can suggest deactivating.
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_service(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  delete from public.barber_services where service_id = p_id;

  begin
    delete from public.services where id = p_id;
  exception when foreign_key_violation then
    raise exception 'SERVICE_IN_USE';
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Create a barber. Generates a unique slug, links every service, and seeds a
-- default 10:00â€“19:00 weekly schedule (editable afterwards). Returns new id.
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_barber(
  p_name text,
  p_title text,
  p_bio text,
  p_specialties text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_i integer := 1;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'NAME_REQUIRED';
  end if;

  v_base := btrim(regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g'), '-');
  if v_base = '' then
    v_base := 'barber';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.barbers where slug = v_slug) loop
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i;
  end loop;

  insert into public.barbers (slug, name, title, bio, specialties, is_active, sort_order)
  values (
    v_slug, btrim(p_name),
    nullif(btrim(coalesce(p_title, '')), ''),
    nullif(btrim(coalesce(p_bio, '')), ''),
    coalesce(p_specialties, '{}'),
    true,
    coalesce((select max(sort_order) from public.barbers), 0) + 1
  )
  returning id into v_id;

  insert into public.barber_services (barber_id, service_id)
  select v_id, s.id from public.services s
  on conflict do nothing;

  insert into public.barber_availability (barber_id, day_of_week, start_time, end_time, is_available)
  select v_id, d.dow, time '10:00', time '19:00', true
  from generate_series(0, 6) as d(dow)
  on conflict (barber_id, day_of_week, start_time, end_time) do nothing;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Update a barber's profile information.
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_barber(
  p_id uuid,
  p_name text,
  p_title text,
  p_bio text,
  p_specialties text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'NAME_REQUIRED';
  end if;

  update public.barbers set
    name = btrim(p_name),
    title = nullif(btrim(coalesce(p_title, '')), ''),
    bio = nullif(btrim(coalesce(p_bio, '')), ''),
    specialties = coalesce(p_specialties, specialties)
  where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Delete a barber. Schedule, time off, and service links cascade. If the
-- barber has appointments / check-ins / queue history the delete is blocked
-- and BARBER_IN_USE is raised so the UI can suggest deactivating instead.
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_barber(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  begin
    delete from public.barbers where id = p_id;
  exception when foreign_key_violation then
    raise exception 'BARBER_IN_USE';
  end;
end;
$$;

grant execute on function public.admin_delete_service(uuid) to authenticated;
grant execute on function public.admin_create_barber(text, text, text, text[]) to authenticated;
grant execute on function public.admin_update_barber(uuid, text, text, text, text[]) to authenticated;
grant execute on function public.admin_delete_barber(uuid) to authenticated;



