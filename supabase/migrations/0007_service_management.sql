-- EuroBarbers — Migration 0007
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
