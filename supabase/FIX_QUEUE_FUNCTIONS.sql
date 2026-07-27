-- EuroBarbers — Queue/lobby function fix (re-runnable, idempotent).
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
