-- EuroBarbers — Functions, views, and Row Level Security
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
-- Lobby display view (safe — first name + last initial only)
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
