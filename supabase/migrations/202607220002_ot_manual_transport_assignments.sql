begin;

alter table public.vehicle_assignments
  alter column vehicle_id drop not null,
  alter column driver_id drop not null,
  add column if not exists manual_transport_units jsonb not null default '[]'::jsonb;

alter table public.vehicle_assignments
  drop constraint if exists vehicle_assignments_source_check;

alter table public.vehicle_assignments
  add constraint vehicle_assignments_source_check check (
    (vehicle_id is not null and driver_id is not null)
    or
    (
      vehicle_id is null
      and driver_id is null
      and jsonb_typeof(manual_transport_units) = 'array'
      and jsonb_array_length(manual_transport_units) > 0
    )
  );

create or replace function public.assign_overtime_booking_manual(
  p_booking_id uuid,
  p_transport_units jsonb,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.bookings;
  unit jsonb;
begin
  if public.app_role() <> 'admin' then
    raise exception 'Admin role required.';
  end if;

  select * into target from public.bookings where id = p_booking_id for update;
  if target.id is null or target.request_type <> 'overtime' then
    raise exception 'This function is only available for OT requests.';
  end if;
  if target.status not in ('approved','assigned') then
    raise exception 'Only approved requests can be assigned.';
  end if;
  if jsonb_typeof(p_transport_units) <> 'array' or jsonb_array_length(p_transport_units) = 0 then
    raise exception 'At least one vehicle and driver is required.';
  end if;

  for unit in select value from jsonb_array_elements(p_transport_units)
  loop
    if nullif(btrim(unit->>'licensePlate'), '') is null
      or nullif(btrim(unit->>'brand'), '') is null
      or nullif(btrim(unit->>'vehicleType'), '') is null
      or nullif(btrim(unit->>'driverName'), '') is null then
      raise exception 'License plate, brand, vehicle type, and driver name are required for every transport unit.';
    end if;
  end loop;

  insert into public.vehicle_assignments (
    booking_id, vehicle_id, driver_id, assigned_by, notes,
    manual_transport_units, driver_accepted, driver_accepted_at, assigned_at
  ) values (
    p_booking_id, null, null, auth.uid(), p_notes,
    p_transport_units, false, null, now()
  )
  on conflict (booking_id) do update set
    vehicle_id = null, driver_id = null, assigned_by = excluded.assigned_by,
    notes = excluded.notes, manual_transport_units = excluded.manual_transport_units,
    driver_accepted = false, driver_accepted_at = null, assigned_at = now();

  update public.bookings
  set status = 'assigned',
      updated_at = now()
  where id = p_booking_id;
end;
$$;

revoke all on function public.assign_overtime_booking_manual(uuid, jsonb, text) from public;
grant execute on function public.assign_overtime_booking_manual(uuid, jsonb, text) to authenticated;

notify pgrst, 'reload schema';

commit;
