-- EuroBarbers — Migration 0008
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
-- default 10:00–19:00 weekly schedule (editable afterwards). Returns new id.
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
