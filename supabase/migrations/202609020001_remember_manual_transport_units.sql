-- Reusable GA memory for daily vehicle and driver pairings.
create table if not exists public.transport_unit_memories (
  id uuid primary key default gen_random_uuid(),
  lookup_key text not null unique,
  license_plate text not null,
  brand text not null default '',
  vehicle_type text not null,
  driver_name text not null,
  driver_phone text not null default '',
  times_used integer not null default 0,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transport_unit_memories enable row level security;

create policy transport_unit_memories_admin_read on public.transport_unit_memories
for select to authenticated using (public.app_role() = 'admin');

create or replace function public.remember_manual_transport_units()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  unit jsonb;
  plate text;
begin
  if new.manual_transport_units is null then return new; end if;
  for unit in select value from jsonb_array_elements(new.manual_transport_units)
  loop
    plate := nullif(btrim(unit->>'licensePlate'), '');
    if plate is not null
      and nullif(btrim(unit->>'vehicleType'), '') is not null
      and nullif(btrim(unit->>'driverName'), '') is not null then
      insert into public.transport_unit_memories (
        lookup_key, license_plate, brand, vehicle_type, driver_name, driver_phone,
        times_used, last_used_at
      ) values (
        lower(plate), plate, coalesce(nullif(btrim(unit->>'brand'), ''), ''),
        btrim(unit->>'vehicleType'), btrim(unit->>'driverName'),
        coalesce(nullif(btrim(unit->>'driverPhone'), ''), ''), 1, now()
      ) on conflict (lookup_key) do update set
        license_plate = excluded.license_plate,
        brand = excluded.brand,
        vehicle_type = excluded.vehicle_type,
        driver_name = excluded.driver_name,
        driver_phone = excluded.driver_phone,
        times_used = public.transport_unit_memories.times_used + 1,
        last_used_at = now(),
        updated_at = now();
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists remember_manual_transport_units on public.vehicle_assignments;
create trigger remember_manual_transport_units
after insert or update of manual_transport_units on public.vehicle_assignments
for each row execute function public.remember_manual_transport_units();

revoke all on function public.remember_manual_transport_units() from public;
notify pgrst, 'reload schema';
