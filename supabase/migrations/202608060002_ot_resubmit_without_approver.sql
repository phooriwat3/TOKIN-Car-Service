begin;

create or replace function public.resubmit_booking(
  p_booking_id uuid,
  p_request_type text,
  p_approver_id uuid,
  p_using_date date,
  p_start_time time,
  p_end_time time,
  p_pickup_location text,
  p_destination text,
  p_purpose text,
  p_meeting_point text,
  p_with_staff boolean,
  p_passengers jsonb default '[]'::jsonb,
  p_overtime_employees jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.bookings;
  selected_approver public.profiles;
  employee jsonb;
  passenger jsonb;
  passenger_count integer;
begin
  select * into target from public.bookings where id = p_booking_id for update;
  if target.id is null or target.requester_id <> auth.uid() then
    raise exception 'Request not found or access denied.';
  end if;
  if target.status <> 'changes_requested' then
    raise exception 'Only a request returned for changes can be resubmitted.';
  end if;
  if p_request_type not in ('outside_company', 'overtime') then
    raise exception 'Invalid request type.';
  end if;
  if p_end_time <= p_start_time then
    raise exception 'End time must be after start time.';
  end if;

  if p_request_type = 'outside_company' then
    select * into selected_approver from public.profiles
    where id = p_approver_id and role = 'approver' and is_active;
    if selected_approver.id is null then
      raise exception 'Approver is unavailable.';
    end if;
  end if;

  passenger_count := case
    when p_request_type = 'overtime' then (
      select count(*) from jsonb_array_elements(coalesce(p_overtime_employees, '[]'::jsonb)) value
      where coalesce((value ->> 'transportRequired')::boolean, false)
    )
    else greatest(1, jsonb_array_length(coalesce(p_passengers, '[]'::jsonb)))
  end;
  if passenger_count < 1 or passenger_count > 20 then
    raise exception 'Passenger count must be between 1 and 20.';
  end if;

  delete from public.booking_passengers where booking_id = p_booking_id;
  delete from public.overtime_employees where booking_id = p_booking_id;

  update public.bookings set
    status = case when p_request_type = 'overtime' then 'pending_ot_verification' else 'pending_approval' end,
    request_type = p_request_type,
    approver_id = case when p_request_type = 'outside_company' then selected_approver.id else null end,
    approver_name = case when p_request_type = 'outside_company' then selected_approver.full_name else null end,
    approver_email = case when p_request_type = 'outside_company' then selected_approver.email else null end,
    category = case when p_request_type = 'overtime' then 'overtime_transport' else 'business_trip' end,
    using_date = p_using_date,
    start_time = p_start_time,
    end_time = p_end_time,
    pickup_location = p_pickup_location,
    destination = p_destination,
    purpose = p_purpose,
    num_passengers = passenger_count,
    meeting_point = p_meeting_point,
    with_staff = p_with_staff,
    after_hours = p_request_type = 'overtime',
    overtime_transport = p_request_type = 'overtime',
    ot_verification_status = case when p_request_type = 'overtime' then 'pending' else 'not_required' end,
    ot_verified_at = null,
    ot_verified_by = null,
    ot_verification_note = null,
    approval_email_status = case when p_request_type = 'overtime' then 'not_configured' else 'pending' end,
    reject_reason = null,
    updated_at = now()
  where id = p_booking_id;

  if p_request_type = 'outside_company' then
    for passenger in select value from jsonb_array_elements(coalesce(p_passengers, '[]'::jsonb)) loop
      insert into public.booking_passengers (booking_id, name, seq)
      values (
        p_booking_id,
        trim(both '"' from passenger::text),
        (select count(*) from public.booking_passengers where booking_id = p_booking_id)
      );
    end loop;
  else
    for employee in select value from jsonb_array_elements(coalesce(p_overtime_employees, '[]'::jsonb)) loop
      insert into public.overtime_employees (
        booking_id, employee_id, employee_name, work_description, work_start, work_end,
        total_weekly_hours, transport_required, bus_stop, seq
      ) values (
        p_booking_id,
        employee ->> 'employeeId',
        employee ->> 'employeeName',
        employee ->> 'workDescription',
        (employee ->> 'workStart')::time,
        (employee ->> 'workEnd')::time,
        (employee ->> 'totalWeeklyHours')::numeric,
        coalesce((employee ->> 'transportRequired')::boolean, false),
        nullif(employee ->> 'busStop', ''),
        (select count(*) from public.overtime_employees where booking_id = p_booking_id)
      );
    end loop;
  end if;
end;
$$;

revoke all on function public.resubmit_booking(uuid,text,uuid,date,time,time,text,text,text,text,boolean,jsonb,jsonb) from public;
grant execute on function public.resubmit_booking(uuid,text,uuid,date,time,time,text,text,text,text,boolean,jsonb,jsonb) to authenticated;

commit;
