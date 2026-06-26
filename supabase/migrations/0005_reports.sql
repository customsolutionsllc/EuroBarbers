-- EuroBarbers — Migration 0005
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
