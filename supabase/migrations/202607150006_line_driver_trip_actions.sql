begin;

create or replace function public.line_accept_assignment(
  p_booking_id uuid,
  p_driver_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.vehicle_assignments va
    join public.bookings b on b.id = va.booking_id
    join public.drivers d on d.id = va.driver_id
    where va.booking_id = p_booking_id
      and va.driver_id = p_driver_id
      and d.is_active
      and b.status = 'assigned'
  ) then
    raise exception 'This trip is not assigned to this driver.';
  end if;

  update public.vehicle_assignments
  set driver_accepted = true, driver_accepted_at = now()
  where booking_id = p_booking_id and driver_id = p_driver_id;
end;
$$;

create or replace function public.line_start_trip(
  p_booking_id uuid,
  p_driver_id uuid,
  p_actual_time_out timestamptz,
  p_start_mileage numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_start_mileage <= 0 then
    raise exception 'Starting mileage must be positive.';
  end if;

  if not exists (
    select 1
    from public.vehicle_assignments va
    join public.bookings b on b.id = va.booking_id
    join public.drivers d on d.id = va.driver_id
    where va.booking_id = p_booking_id
      and va.driver_id = p_driver_id
      and va.driver_accepted
      and d.is_active
      and b.status = 'assigned'
  ) then
    raise exception 'This accepted trip is not assigned to this driver.';
  end if;

  insert into public.trip_logs (booking_id, actual_time_out, start_mileage, recorded_by)
  values (p_booking_id, coalesce(p_actual_time_out, now()), p_start_mileage, null)
  on conflict (booking_id) do update set
    actual_time_out = excluded.actual_time_out,
    start_mileage = excluded.start_mileage,
    recorded_by = null,
    updated_at = now();

  update public.bookings
  set status = 'in_progress', updated_at = now()
  where id = p_booking_id;
end;
$$;

create or replace function public.line_complete_trip(
  p_booking_id uuid,
  p_driver_id uuid,
  p_actual_time_in timestamptz,
  p_end_mileage numeric,
  p_fuel_cost numeric default 0,
  p_toll_fee numeric default 0,
  p_parking_fee numeric default 0,
  p_remarks text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  start_value numeric;
begin
  if not exists (
    select 1
    from public.vehicle_assignments va
    join public.bookings b on b.id = va.booking_id
    join public.drivers d on d.id = va.driver_id
    where va.booking_id = p_booking_id
      and va.driver_id = p_driver_id
      and d.is_active
      and b.status = 'in_progress'
  ) then
    raise exception 'This active trip is not assigned to this driver.';
  end if;

  select start_mileage into start_value
  from public.trip_logs
  where booking_id = p_booking_id
  for update;

  if start_value is null or p_end_mileage <= start_value then
    raise exception 'Ending mileage must exceed starting mileage.';
  end if;
  if least(p_fuel_cost, p_toll_fee, p_parking_fee) < 0 then
    raise exception 'Expenses cannot be negative.';
  end if;

  update public.trip_logs set
    actual_time_in = coalesce(p_actual_time_in, now()),
    end_mileage = p_end_mileage,
    remarks = p_remarks,
    updated_at = now()
  where booking_id = p_booking_id;

  insert into public.expenses (booking_id, fuel_cost, toll_fee, parking_fee)
  values (p_booking_id, p_fuel_cost, p_toll_fee, p_parking_fee)
  on conflict (booking_id) do update set
    fuel_cost = excluded.fuel_cost,
    toll_fee = excluded.toll_fee,
    parking_fee = excluded.parking_fee,
    updated_at = now();

  update public.bookings
  set status = 'completed', updated_at = now()
  where id = p_booking_id;
end;
$$;

revoke all on function public.line_accept_assignment(uuid, uuid) from public, anon, authenticated;
revoke all on function public.line_start_trip(uuid, uuid, timestamptz, numeric) from public, anon, authenticated;
revoke all on function public.line_complete_trip(uuid, uuid, timestamptz, numeric, numeric, numeric, numeric, text) from public, anon, authenticated;

grant execute on function public.line_accept_assignment(uuid, uuid) to service_role;
grant execute on function public.line_start_trip(uuid, uuid, timestamptz, numeric) to service_role;
grant execute on function public.line_complete_trip(uuid, uuid, timestamptz, numeric, numeric, numeric, numeric, text) to service_role;

commit;
