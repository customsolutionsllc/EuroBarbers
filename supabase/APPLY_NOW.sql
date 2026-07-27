-- ============================================================
-- supabase\migrations\0006_schedule_management.sql
-- ============================================================

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




-- ============================================================
-- supabase\FIX_QUEUE_FUNCTIONS.sql
-- ============================================================

-- EuroBarbers â€” Queue/lobby function fix (re-runnable, idempotent).
-- Fixes the "column reference id is ambiguous" error by aliasing the
-- shop_settings table inside each function. Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- Staff queue (admin/barber dashboard)
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

  select ss.timezone into v_tz from public.shop_settings ss where ss.id = true;
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
-- Lobby TV queue (token-gated, public-safe)
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
  select ss.queue_display_token, ss.timezone into v_token, v_tz
  from public.shop_settings ss where ss.id = true;

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
-- Staff appointments for a given day (privacy-scoped by role)
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

  select ss.timezone into v_tz from public.shop_settings ss where ss.id = true;
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




-- ============================================================
-- supabase\migrations\0007_service_management.sql
-- ============================================================

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




-- ============================================================
-- supabase\migrations\0008_barber_and_service_management.sql
-- ============================================================

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




-- ============================================================
-- supabase\MOCK_DATA.sql
-- ============================================================

-- EuroBarbers â€” Demo / mock data (safe to re-run; clears its own previous run).
-- Populates: 2 real-named barbers (replacing placeholders), mock customers,
-- a live walk-in queue (waiting + sitting), today's calendar appointments,
-- and ~60 days of historical visits so the Reports page has meaningful data.
--
-- All mock customers use phone numbers in the 614-555-01xx range, which is how
-- this script finds and removes its own previous data before re-inserting.

-- ---------------------------------------------------------------------------
-- 1) Replace placeholder barbers with real names (idempotent by slug)
-- ---------------------------------------------------------------------------
update public.barbers set
  name = 'Marko',
  slug = 'marko',
  title = 'Senior Barber',
  bio = 'Detail-driven barber specializing in skin fades, beard sculpting, and hot-towel finishes.',
  specialties = array['Skin fades', 'Beard sculpting', 'Hot towel shaves']
where slug in ('barber-two', 'marko');

update public.barbers set
  name = 'Luka',
  slug = 'luka',
  title = 'Barber',
  bio = 'Versatile barber known for clean classic cuts, tapers, and patient kids'' cuts.',
  specialties = array['Classic cuts', 'Tapers', 'Kids cuts']
where slug in ('barber-three', 'luka');

-- ---------------------------------------------------------------------------
-- 2) Clear any previous mock data (FK-safe order)
-- ---------------------------------------------------------------------------
delete from public.walk_in_queue
  where customer_id in (select id from public.customers where normalized_phone like '61455501%');
delete from public.check_ins
  where customer_id in (select id from public.customers where normalized_phone like '61455501%');
delete from public.appointments
  where customer_id in (select id from public.customers where normalized_phone like '61455501%');
delete from public.customers where normalized_phone like '61455501%';

-- ---------------------------------------------------------------------------
-- 3) Insert mock customers + queue + appointments + history
-- ---------------------------------------------------------------------------
do $$
declare
  v_tz text := 'America/New_York';
  v_today date := (now() at time zone v_tz)::date;
  v_elis uuid;
  v_marko uuid;
  v_luka uuid;
  v_men uuid;  v_fade uuid; v_beard uuid; v_combo uuid; v_kids uuid; v_shave uuid;
  cust uuid[];
  v_barbers uuid[];
  v_services uuid[];
  d integer; k integer; n integer;
  v_cust uuid; v_svc uuid; v_bar uuid; v_status text;
  v_ts timestamptz;
  v_ci uuid;
begin
  select id into v_elis  from public.barbers where slug = 'elis';
  select id into v_marko from public.barbers where slug = 'marko';
  select id into v_luka  from public.barbers where slug = 'luka';

  select id into v_men   from public.services where slug = 'mens-haircut';
  select id into v_fade  from public.services where slug = 'skin-fade';
  select id into v_beard from public.services where slug = 'beard-trim';
  select id into v_combo from public.services where slug = 'haircut-beard';
  select id into v_kids  from public.services where slug = 'kids-haircut';
  select id into v_shave from public.services where slug = 'hot-towel-shave';

  select array_agg(id order by sort_order) into v_barbers
    from public.barbers where is_active = true;
  select array_agg(id order by sort_order) into v_services
    from public.services where is_active = true;

  -- ----- mock customers -----
  insert into public.customers
    (first_name, last_name, phone, email, sms_transactional_consent, sms_transactional_consent_at, last_seen_at)
  values
    ('James',  'Carter',  '614-555-0101', 'james.carter@example.com',  true, now(), now()),
    ('Michael','Brooks',  '614-555-0102', 'm.brooks@example.com',      true, now(), now()),
    ('David',  'Nguyen',  '614-555-0103', 'david.nguyen@example.com',  true, now(), now()),
    ('Chris',  'Romano',  '614-555-0104', 'chris.romano@example.com',  true, now(), now()),
    ('Anthony','Russo',   '614-555-0105', 'a.russo@example.com',       true, now(), now()),
    ('Daniel', 'Foster',  '614-555-0106', 'daniel.foster@example.com', true, now(), now()),
    ('Kevin',  'Walsh',   '614-555-0107', 'kevin.walsh@example.com',   true, now(), now()),
    ('Brian',  'Hayes',   '614-555-0108', 'brian.hayes@example.com',   true, now(), now()),
    ('Steven', 'Park',    '614-555-0109', 'steven.park@example.com',   true, now(), now()),
    ('Marcus', 'Bell',    '614-555-0110', 'marcus.bell@example.com',   true, now(), now()),
    ('Tyler',  'Hughes',  '614-555-0111', 'tyler.hughes@example.com',  true, now(), now()),
    ('Omar',   'Haddad',  '614-555-0112', 'omar.haddad@example.com',   true, now(), now());

  select array_agg(id order by created_at, normalized_phone) into cust
    from public.customers where normalized_phone like '61455501%';

  -- ----- live walk-in queue: 2 sitting (in_chair), 1 next, 2 waiting -----
  -- James sitting with Elis
  insert into public.check_ins (customer_id, service_id, barber_id, preferred_barber_id, served_by_barber_id, check_in_type, status, checked_in_at)
  values (cust[1], v_fade, v_elis, v_elis, v_elis, 'walk_in', 'in_chair', now() - interval '28 min')
  returning id into v_ci;
  insert into public.walk_in_queue (customer_id, check_in_id, service_id, barber_id, preferred_barber_id, served_by_barber_id, position, status, checked_in_at, called_at, started_at)
  values (cust[1], v_ci, v_fade, v_elis, v_elis, v_elis, 1, 'in_chair', now() - interval '28 min', now() - interval '24 min', now() - interval '22 min');

  -- Michael sitting with Marko
  insert into public.check_ins (customer_id, service_id, barber_id, preferred_barber_id, served_by_barber_id, check_in_type, status, checked_in_at)
  values (cust[2], v_combo, v_marko, v_marko, v_marko, 'walk_in', 'in_chair', now() - interval '20 min')
  returning id into v_ci;
  insert into public.walk_in_queue (customer_id, check_in_id, service_id, barber_id, preferred_barber_id, served_by_barber_id, position, status, checked_in_at, called_at, started_at)
  values (cust[2], v_ci, v_combo, v_marko, v_marko, v_marko, 2, 'in_chair', now() - interval '20 min', now() - interval '16 min', now() - interval '14 min');

  -- David up next (first available)
  insert into public.check_ins (customer_id, service_id, check_in_type, status, checked_in_at)
  values (cust[3], v_men, 'walk_in', 'next', now() - interval '12 min')
  returning id into v_ci;
  insert into public.walk_in_queue (customer_id, check_in_id, service_id, position, status, checked_in_at, called_at)
  values (cust[3], v_ci, v_men, 3, 'next', now() - interval '12 min', now() - interval '1 min');

  -- Chris waiting (prefers Luka)
  insert into public.check_ins (customer_id, service_id, preferred_barber_id, check_in_type, status, checked_in_at)
  values (cust[4], v_beard, v_luka, 'walk_in', 'waiting', now() - interval '8 min')
  returning id into v_ci;
  insert into public.walk_in_queue (customer_id, check_in_id, service_id, preferred_barber_id, position, status, checked_in_at)
  values (cust[4], v_ci, v_beard, v_luka, 4, 'waiting', now() - interval '8 min');

  -- Anthony waiting (first available)
  insert into public.check_ins (customer_id, service_id, check_in_type, status, checked_in_at)
  values (cust[5], v_shave, 'walk_in', 'waiting', now() - interval '3 min')
  returning id into v_ci;
  insert into public.walk_in_queue (customer_id, check_in_id, service_id, position, status, checked_in_at)
  values (cust[5], v_ci, v_shave, 5, 'waiting', now() - interval '3 min');

  -- ----- today's calendar appointments (non-overlapping per barber) -----
  -- Elis
  insert into public.appointments (customer_id, barber_id, service_id, appointment_start, appointment_end, status) values
    (cust[6],  v_elis, v_men,   (v_today + time '09:00') at time zone v_tz, (v_today + time '09:00') at time zone v_tz + interval '35 min', 'completed'),
    (cust[7],  v_elis, v_combo, (v_today + time '11:00') at time zone v_tz, (v_today + time '11:00') at time zone v_tz + interval '60 min', 'confirmed'),
    (cust[8],  v_elis, v_fade,  (v_today + time '14:00') at time zone v_tz, (v_today + time '14:00') at time zone v_tz + interval '55 min', 'confirmed');
  -- Marko
  insert into public.appointments (customer_id, barber_id, service_id, appointment_start, appointment_end, status) values
    (cust[9],  v_marko, v_fade,  (v_today + time '09:30') at time zone v_tz, (v_today + time '09:30') at time zone v_tz + interval '55 min', 'completed'),
    (cust[10], v_marko, v_beard, (v_today + time '12:00') at time zone v_tz, (v_today + time '12:00') at time zone v_tz + interval '25 min', 'confirmed'),
    (cust[11], v_marko, v_men,   (v_today + time '15:00') at time zone v_tz, (v_today + time '15:00') at time zone v_tz + interval '35 min', 'scheduled');
  -- Luka
  insert into public.appointments (customer_id, barber_id, service_id, appointment_start, appointment_end, status) values
    (cust[12], v_luka, v_kids,  (v_today + time '10:00') at time zone v_tz, (v_today + time '10:00') at time zone v_tz + interval '35 min', 'completed'),
    (cust[1],  v_luka, v_men,   (v_today + time '13:00') at time zone v_tz, (v_today + time '13:00') at time zone v_tz + interval '35 min', 'confirmed'),
    (cust[2],  v_luka, v_shave, (v_today + time '16:00') at time zone v_tz, (v_today + time '16:00') at time zone v_tz + interval '35 min', 'scheduled');

  -- ----- ~60 days of historical visits for reporting -----
  for d in 1..60 loop
    n := 3 + floor(random() * 8)::int;  -- 3..10 visits/day
    for k in 1..n loop
      v_cust := cust[1 + floor(random() * array_length(cust, 1))::int];
      v_svc  := v_services[1 + floor(random() * array_length(v_services, 1))::int];
      v_bar  := v_barbers[1 + floor(random() * array_length(v_barbers, 1))::int];
      if random() < 0.85 then
        v_status := 'completed';
      elsif random() < 0.6 then
        v_status := 'no_show';
      else
        v_status := 'canceled';
      end if;
      v_ts := ((v_today - d)::timestamp
               + make_interval(hours => 10 + floor(random() * 8)::int, mins => (floor(random() * 4)::int) * 15))
              at time zone v_tz;

      insert into public.check_ins
        (customer_id, service_id, barber_id, served_by_barber_id, check_in_type, status, checked_in_at, completed_at)
      values
        (v_cust, v_svc, v_bar, v_bar, 'walk_in', v_status, v_ts,
         case when v_status = 'completed' then v_ts + interval '30 min' end);
    end loop;
  end loop;
end;
$$;




