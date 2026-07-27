-- EuroBarbers — Demo / mock data (safe to re-run; clears its own previous run).
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
