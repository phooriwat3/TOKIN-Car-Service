begin;

-- HR/GA can create OT transportation on behalf of an employee. This covers
-- requests made before the Tiger Space entry exists and managers who cannot
-- submit an OT entry in Tiger Space.
alter table public.bookings
  add column if not exists request_origin text not null default 'employee'
    check (request_origin in ('employee', 'hr_direct')),
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists created_by_name text,
  add column if not exists ot_verification_mode text not null default 'tiger_space'
    check (ot_verification_mode in ('tiger_space', 'manager_exception'));

comment on column public.bookings.request_origin is
  'employee for self-service requests; hr_direct when HR/GA creates OT transportation for an employee.';
comment on column public.bookings.created_by is
  'Authenticated profile that created the booking when acting on behalf of another employee.';

create or replace function public.create_admin_transport_booking(
  p_employee_profile_id uuid,
  p_using_date date,
  p_start_time time,
  p_end_time time,
  p_pickup_location text,
  p_destination text,
  p_purpose text,
  p_meeting_point text default 'front_area',
  p_urgent boolean default false,
  p_urgent_reason text default null,
  p_verification_mode text default 'tiger_space'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  employee_profile record;
  admin_profile record;
  new_booking_id uuid;
begin
  if public.app_role() <> 'admin' then
    raise exception 'Admin role required.';
  end if;

  select p.id, p.employee_id, p.full_name, p.email, p.department_id,
         d.name as department_name
    into employee_profile
  from public.profiles p
  join public.departments d on d.id = p.department_id
  where p.id = p_employee_profile_id and p.is_active;

  if employee_profile.id is null then
    raise exception 'Active employee profile not found.';
  end if;
  if nullif(btrim(coalesce(employee_profile.email, '')), '') is null then
    raise exception 'The employee profile must have an email address.';
  end if;

  select p.id, p.full_name into admin_profile
  from public.profiles p
  where p.id = auth.uid() and p.is_active;

  if p_using_date is null then raise exception 'Using date is required.'; end if;
  if p_start_time is null or p_end_time is null or p_end_time <= p_start_time then
    raise exception 'End time must be later than start time.';
  end if;
  if nullif(btrim(coalesce(p_pickup_location, '')), '') is null
     or nullif(btrim(coalesce(p_destination, '')), '') is null
     or nullif(btrim(coalesce(p_purpose, '')), '') is null then
    raise exception 'Pickup, destination, and reason are required.';
  end if;
  if p_meeting_point not in ('front_area', 'loading_area') then
    raise exception 'Invalid meeting point.';
  end if;
  if p_verification_mode not in ('tiger_space', 'manager_exception') then
    raise exception 'Invalid OT verification mode.';
  end if;
  if p_urgent and nullif(btrim(coalesce(p_urgent_reason, '')), '') is null then
    raise exception 'Urgent reason is required.';
  end if;

  insert into public.bookings (
    requester_id, requester_name, requester_email, requester_employee_id,
    requester_department, department_id, status, request_type, category,
    using_date, start_time, end_time, pickup_location, destination, purpose,
    num_passengers, meeting_point, vehicle_type_pref, driver_required,
    urgent, urgent_reason, after_hours, overtime_transport,
    approval_email_status, requester_notification_status,
    source_system, source_confirmed, ot_verification_status,
    ot_verification_mode, ot_verification_note,
    request_origin, created_by, created_by_name
  ) values (
    employee_profile.id, employee_profile.full_name, employee_profile.email,
    employee_profile.employee_id, employee_profile.department_name,
    employee_profile.department_id, 'approved', 'overtime', 'overtime_transport',
    p_using_date, p_start_time, p_end_time, btrim(p_pickup_location),
    btrim(p_destination), btrim(p_purpose), 1, p_meeting_point, 'any', true,
    p_urgent, case when p_urgent then btrim(p_urgent_reason) else null end,
    true, true, 'not_configured', 'pending', 'transport_portal', false,
    case when p_verification_mode = 'manager_exception' then 'not_required' else 'pending' end,
    p_verification_mode,
    case when p_verification_mode = 'manager_exception'
      then 'Manager exception confirmed by HR; no Tiger Space record is expected.'
      else 'HR created the transport request before Tiger Space verification.' end,
    'hr_direct', admin_profile.id, admin_profile.full_name
  )
  returning id into new_booking_id;

  insert into public.overtime_employees (
    booking_id, employee_id, employee_name, employee_email,
    work_description, work_start, work_end, total_weekly_hours,
    transport_required, bus_stop, seq
  ) values (
    new_booking_id, employee_profile.employee_id, employee_profile.full_name,
    employee_profile.email, btrim(p_purpose), p_start_time, p_end_time, 0,
    true, btrim(p_destination), 0
  );

  return new_booking_id;
end;
$$;

revoke all on function public.create_admin_transport_booking(
  uuid, date, time, time, text, text, text, text, boolean, text, text
) from public;
grant execute on function public.create_admin_transport_booking(
  uuid, date, time, time, text, text, text, text, boolean, text, text
) to authenticated;

-- HR-created requests may be verified after the vehicle has already been
-- arranged. Preserve the operational trip status when recording that result.
create or replace function public.verify_tiger_space_booking(
  p_booking_id uuid,
  p_result text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.bookings;
begin
  if public.app_role() <> 'admin' then raise exception 'Admin role required.'; end if;
  if p_result not in ('pending','verified','not_found','rejected') then
    raise exception 'Invalid Tiger Space verification result.';
  end if;

  select * into target from public.bookings where id = p_booking_id for update;
  if target.id is null then raise exception 'Request not found.'; end if;
  if target.request_type <> 'overtime' then
    raise exception 'Tiger Space verification applies only to OT transport requests.';
  end if;
  if target.ot_verification_mode = 'manager_exception' then
    raise exception 'Manager exception requests do not require Tiger Space verification.';
  end if;
  if target.status = 'cancelled'
     or (target.status in ('assigned','scheduled','in_progress','completed')
         and target.request_origin <> 'hr_direct') then
    raise exception 'This request can no longer change OT verification status.';
  end if;

  update public.bookings
  set
    ot_verification_status = p_result,
    ot_verification_note = nullif(btrim(coalesce(p_note, '')), ''),
    ot_verified_at = case when p_result = 'verified' then now() else null end,
    ot_verified_by = case when p_result = 'verified' then auth.uid() else null end,
    status = case
      when request_origin = 'hr_direct' then status
      when p_result = 'verified' then 'approved'
      when p_result = 'rejected' then 'rejected'
      else 'pending_ot_verification'
    end,
    reject_reason = case
      when p_result = 'rejected' then coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'OT was not approved in Tiger Space.')
      else null
    end,
    updated_at = now()
  where id = p_booking_id;
end;
$$;

revoke all on function public.verify_tiger_space_booking(uuid, text, text) from public;
grant execute on function public.verify_tiger_space_booking(uuid, text, text) to authenticated;

create index if not exists bookings_hr_direct_queue_idx
  on public.bookings(using_date, status)
  where request_origin = 'hr_direct';

notify pgrst, 'reload schema';
commit;
