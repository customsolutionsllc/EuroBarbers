-- EuroBarbers — Seed data (placeholder values; editable in admin).
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
  ('barber-two', 'Barber Two', 'Barber',        'Placeholder profile — update in the admin dashboard.', array['Fades','Line-ups'], true, 2),
  ('barber-three','Barber Three','Barber',       'Placeholder profile — update in the admin dashboard.', array['Beards','Tapers'], true, 3)
on conflict (slug) do nothing;

-- Every barber can perform every service (adjust later in admin).
insert into public.barber_services (barber_id, service_id)
select b.id, s.id from public.barbers b cross join public.services s
on conflict do nothing;

-- Weekly availability: open 10:00–19:00 every day (placeholder; adjust per barber).
insert into public.barber_availability (barber_id, day_of_week, start_time, end_time, is_available)
select b.id, d.dow, time '10:00', time '19:00', true
from public.barbers b
cross join generate_series(0, 6) as d(dow)
on conflict (barber_id, day_of_week, start_time, end_time) do nothing;
