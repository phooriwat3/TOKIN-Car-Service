begin;

-- Tiger Space remains the source of truth for OT approval. This application
-- records only the employee's transportation requirement and GA's daily
-- vehicle/driver arrangement.
alter table public.bookings
  add column if not exists source_system text not null default 'transport_portal'
    check (source_system in ('transport_portal', 'tiger_space')),
  add column if not exists source_reference text,
  add column if not exists source_confirmed boolean not null default false;

comment on column public.bookings.source_reference is
  'Optional Tiger Space or external request reference supplied by the requester.';
comment on column public.bookings.source_confirmed is
  'Requester confirmation that the OT record exists in Tiger Space; this is not an OT approval.';

-- Vehicles and drivers are sourced by GA per service day, so assignments are
-- stored as manual transport units for both request types. They intentionally
-- do not require vehicle/driver master records.
create or replace function public.assign_booking_manual(
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
  transport_unit jsonb;
  expected_employee_ids text[];
  assigned_employee_ids text[];
begin
  if public.app_role() <> 'admin' then
    raise exception 'Admin role required.';
  end if;

  select * into target from public.bookings where id = p_booking_id for update;
  if target.id is null then
    raise exception 'Request not found.';
  end if;
  if target.status not in ('approved','assigned') then
    raise exception 'Only approved requests can be assigned.';
  end if;
  if jsonb_typeof(p_transport_units) <> 'array'
     or jsonb_array_length(p_transport_units) = 0 then
    raise exception 'At least one daily vehicle and driver is required.';
  end if;

  for transport_unit in
    select item.value from jsonb_array_elements(p_transport_units) as item(value)
  loop
    if nullif(btrim(transport_unit->>'unitId'), '') is null
      or nullif(btrim(transport_unit->>'licensePlate'), '') is null
      or nullif(btrim(transport_unit->>'vehicleType'), '') is null
      or nullif(btrim(transport_unit->>'driverName'), '') is null then
      raise exception 'Each daily transport unit requires an ID, vehicle, and driver.';
    end if;
    if transport_unit ? 'employeeIds'
       and jsonb_typeof(transport_unit->'employeeIds') <> 'array' then
      raise exception 'Assigned passenger references must be an array.';
    end if;
  end loop;

  -- For OT transport, every employee in this application requested a ride and
  -- therefore must be assigned exactly once. Ordering must not affect equality.
  if target.request_type = 'overtime' then
    select coalesce(array_agg(employee_id order by employee_id), array[]::text[])
      into expected_employee_ids
    from public.overtime_employees
    where booking_id = p_booking_id and transport_required;

    select coalesce(array_agg(passenger.employee_id order by passenger.employee_id), array[]::text[])
      into assigned_employee_ids
    from (
      select jsonb_array_elements_text(item.value->'employeeIds') as employee_id
      from jsonb_array_elements(p_transport_units) as item(value)
    ) as passenger;

    if cardinality(expected_employee_ids) = 0 then
      raise exception 'No employee requested transportation.';
    end if;
    if assigned_employee_ids <> expected_employee_ids then
      raise exception 'Every employee requesting transportation must be assigned exactly once.';
    end if;
  end if;

  insert into public.vehicle_assignments (
    booking_id, vehicle_id, driver_id, assigned_by, notes,
    manual_transport_units, driver_accepted, driver_accepted_at, assigned_at
  ) values (
    p_booking_id, null, null, auth.uid(), p_notes,
    p_transport_units, false, null, now()
  )
  on conflict (booking_id) do update set
    vehicle_id = null,
    driver_id = null,
    assigned_by = excluded.assigned_by,
    notes = excluded.notes,
    manual_transport_units = excluded.manual_transport_units,
    driver_accepted = false,
    driver_accepted_at = null,
    assigned_at = now();

  update public.bookings
  set status = 'assigned', updated_at = now()
  where id = p_booking_id;
end;
$$;

revoke all on function public.assign_booking_manual(uuid, jsonb, text) from public;
grant execute on function public.assign_booking_manual(uuid, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
commit;
