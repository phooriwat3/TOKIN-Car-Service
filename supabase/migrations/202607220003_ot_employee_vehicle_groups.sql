begin;

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
  expected_employee_ids text[];
  assigned_employee_ids text[];
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
    if nullif(btrim(unit->>'unitId'), '') is null
      or nullif(btrim(unit->>'licensePlate'), '') is null
      or nullif(btrim(unit->>'brand'), '') is null
      or nullif(btrim(unit->>'vehicleType'), '') is null
      or nullif(btrim(unit->>'driverName'), '') is null
      or jsonb_typeof(unit->'employeeIds') <> 'array'
      or jsonb_array_length(unit->'employeeIds') = 0 then
      raise exception 'Each transport unit requires vehicle, driver, and at least one employee.';
    end if;
  end loop;

  select coalesce(array_agg(employee_id order by employee_id), array[]::text[])
  into expected_employee_ids
  from public.overtime_employees
  where booking_id = p_booking_id and transport_required;

  select coalesce(array_agg(employee_id order by employee_id), array[]::text[])
  into assigned_employee_ids
  from (
    select jsonb_array_elements_text(unit->'employeeIds') as employee_id
    from jsonb_array_elements(p_transport_units) unit
  ) assigned;

  if cardinality(expected_employee_ids) = 0 then
    raise exception 'No employees requested transportation.';
  end if;
  if assigned_employee_ids <> expected_employee_ids then
    raise exception 'Every employee requesting transportation must be assigned to exactly one vehicle.';
  end if;

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
  set status = 'assigned', updated_at = now()
  where id = p_booking_id;
end;
$$;

revoke all on function public.assign_overtime_booking_manual(uuid, jsonb, text) from public;
grant execute on function public.assign_overtime_booking_manual(uuid, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
commit;
