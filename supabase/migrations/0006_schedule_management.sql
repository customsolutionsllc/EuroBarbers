-- EuroBarbers — Migration 0006
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
