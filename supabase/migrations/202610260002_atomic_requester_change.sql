-- Execute requester edits and cancellations as one locked database command.
-- The Edge Function continues to validate and normalize user input, while this
-- function owns the authorization, concurrency, token, child-row, and history
-- writes that must either all succeed or all roll back.

begin;

create or replace function public.execute_requester_change(
  p_token_hash text,
  p_action text,
  p_request jsonb default null,
  p_reason text default null,
  p_manage_token_hash text default null,
  p_manage_token_expires_at timestamptz default null,
  p_approval_token_hash text default null,
  p_approval_token_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  access_token public.request_access_tokens%rowtype;
  target public.bookings%rowtype;
  changed public.bookings%rowtype;
  v_request_type text;
  next_status text;
  next_revision integer;
  request_snapshot jsonb;
  passengers jsonb;
  overtime_employees jsonb;
begin
  if coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'The request link is invalid or no longer active.';
  end if;
  if p_action not in ('update', 'cancel') then
    raise exception 'Action must be update or cancel.';
  end if;

  select * into access_token
  from public.request_access_tokens
  where token_hash = p_token_hash
    and token_type = 'requester_manage'
  for update;

  if access_token.id is null
     or access_token.used_at is not null
     or access_token.revoked_at is not null then
    raise exception 'The request link is invalid or no longer active.';
  end if;
  if access_token.expires_at <= clock_timestamp() then
    raise exception 'The request link has expired.';
  end if;

  select * into target
  from public.bookings
  where id = access_token.booking_id
  for update;

  if target.id is null then
    raise exception 'Request not found.';
  end if;
  if target.revision_no <> access_token.revision_no then
    raise exception 'This request has already been updated. Reload it using the latest link.';
  end if;
  if target.status not in (
    'pending_approval', 'pending_ot_verification', 'changes_requested'
  ) then
    raise exception 'This request can no longer be changed because its status is %.', target.status;
  end if;

  next_revision := target.revision_no + 1;

  if p_action = 'cancel' then
    update public.bookings
    set status = 'cancelled',
        revision_no = next_revision,
        updated_at = clock_timestamp()
    where id = target.id
    returning * into changed;

    select to_jsonb(b)
      || jsonb_build_object(
        'booking_passengers', coalesce((
          select jsonb_agg(
            jsonb_build_object('name', bp.name, 'seq', bp.seq)
            order by bp.seq
          )
          from public.booking_passengers bp
          where bp.booking_id = b.id
        ), '[]'::jsonb),
        'overtime_employees', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'employee_id', oe.employee_id,
              'employee_name', oe.employee_name,
              'work_description', oe.work_description,
              'work_start', oe.work_start,
              'work_end', oe.work_end,
              'total_weekly_hours', oe.total_weekly_hours,
              'transport_required', oe.transport_required,
              'bus_stop', oe.bus_stop,
              'seq', oe.seq
            ) order by oe.seq
          )
          from public.overtime_employees oe
          where oe.booking_id = b.id
        ), '[]'::jsonb)
      )
    into request_snapshot
    from public.bookings b
    where b.id = target.id;

    insert into public.booking_revision_history (
      booking_id, revision_no, status, snapshot, change_source,
      changed_by_email, change_reason
    ) values (
      target.id, next_revision, 'cancelled', request_snapshot,
      'requester_edit', target.requester_email,
      'Requester cancelled request.'
    );

    return jsonb_build_object(
      'requestId', target.id,
      'requestNo', target.booking_no,
      'status', 'cancelled',
      'revisionNo', next_revision,
      'workflowVersion', changed.workflow_version
    );
  end if;

  if p_request is null or jsonb_typeof(p_request) <> 'object' then
    raise exception 'Request details are required.';
  end if;

  v_request_type := p_request->>'request_type';
  if v_request_type not in ('outside_company', 'overtime') then
    raise exception 'Request type is invalid.';
  end if;

  passengers := coalesce(p_request->'passengers', '[]'::jsonb);
  overtime_employees := coalesce(p_request->'overtime_employees', '[]'::jsonb);
  if jsonb_typeof(passengers) <> 'array'
     or jsonb_typeof(overtime_employees) <> 'array' then
    raise exception 'Request passenger details are invalid.';
  end if;
  if jsonb_array_length(passengers) > 20
     or jsonb_array_length(overtime_employees) > 20 then
    raise exception 'A request can contain at most 20 employees.';
  end if;
  if v_request_type = 'overtime' and jsonb_array_length(overtime_employees) = 0 then
    raise exception 'At least one OT employee is required.';
  end if;

  if coalesce(p_manage_token_hash, '') !~ '^[0-9a-f]{64}$'
     or p_manage_token_expires_at is null
     or p_manage_token_expires_at <= clock_timestamp() then
    raise exception 'Replacement management link details are invalid.';
  end if;

  if not exists (
    select 1
    from public.departments d
    where d.id = (p_request->>'department_id')::uuid
      and d.is_active
      and d.name = p_request->>'requester_department'
  ) then
    raise exception 'Selected department is unavailable. Please contact Admin.';
  end if;

  if v_request_type = 'outside_company' then
    if coalesce(p_approval_token_hash, '') !~ '^[0-9a-f]{64}$'
       or p_approval_token_expires_at is null
       or p_approval_token_expires_at <= clock_timestamp() then
      raise exception 'Approval link details are invalid.';
    end if;
    if not exists (
      select 1
      from public.profiles p
      where p.id = (p_request->>'approver_id')::uuid
        and p.department_id = (p_request->>'department_id')::uuid
        and p.role = 'approver'
        and p.is_active
        and lower(trim(p.email)) = lower(trim(p_request->>'approver_email'))
    ) then
      raise exception 'Select an active approver assigned to your department.';
    end if;
  end if;

  next_status := case
    when v_request_type = 'overtime' then 'pending_ot_verification'
    else 'pending_approval'
  end;

  update public.bookings
  set requester_name = p_request->>'requester_name',
      requester_employee_id = nullif(p_request->>'requester_employee_id', ''),
      requester_department = p_request->>'requester_department',
      department_id = (p_request->>'department_id')::uuid,
      approver_id = case
        when v_request_type = 'outside_company' then (p_request->>'approver_id')::uuid
        else null
      end,
      approver_name = case
        when v_request_type = 'outside_company' then p_request->>'approver_name'
        else null
      end,
      approver_email = case
        when v_request_type = 'outside_company' then lower(trim(p_request->>'approver_email'))
        else null
      end,
      request_type = v_request_type,
      category = case
        when v_request_type = 'overtime' then 'overtime_transport'
        else 'business_trip'
      end,
      using_date = (p_request->>'using_date')::date,
      start_time = (p_request->>'start_time')::time,
      end_time = (p_request->>'end_time')::time,
      pickup_location = p_request->>'pickup_location',
      destination = p_request->>'destination',
      purpose = p_request->>'purpose',
      num_passengers = (p_request->>'num_passengers')::integer,
      meeting_point = p_request->>'meeting_point',
      with_staff = coalesce((p_request->>'with_staff')::boolean, false),
      after_hours = v_request_type = 'overtime',
      overtime_transport = v_request_type = 'overtime',
      status = next_status,
      ot_verification_status = case
        when v_request_type = 'overtime' then 'pending'
        else 'not_required'
      end,
      ot_verified_at = null,
      ot_verified_by = null,
      ot_verification_note = null,
      reject_reason = null,
      approval_email_status = case
        when v_request_type = 'overtime' then 'not_configured'
        else 'pending'
      end,
      urgent = coalesce((p_request->>'urgent')::boolean, false),
      urgent_reason = nullif(p_request->>'urgent_reason', ''),
      revision_no = next_revision,
      last_submitted_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = target.id
  returning * into changed;

  delete from public.booking_passengers where booking_id = target.id;
  delete from public.overtime_employees where booking_id = target.id;

  if v_request_type = 'outside_company' then
    insert into public.booking_passengers (booking_id, name, seq)
    select target.id, passenger.name, (passenger.ordinality - 1)::integer
    from jsonb_array_elements_text(passengers) with ordinality
      as passenger(name, ordinality);
  else
    insert into public.overtime_employees (
      booking_id, employee_id, employee_name, work_description,
      work_start, work_end, total_weekly_hours, transport_required,
      bus_stop, seq
    )
    select
      target.id,
      employee.employee_id,
      employee.employee_name,
      employee.work_description,
      employee.work_start,
      employee.work_end,
      employee.total_weekly_hours,
      employee.transport_required,
      employee.bus_stop,
      employee.seq
    from jsonb_to_recordset(overtime_employees) as employee(
      employee_id text,
      employee_name text,
      work_description text,
      work_start time,
      work_end time,
      total_weekly_hours numeric,
      transport_required boolean,
      bus_stop text,
      seq integer
    );
  end if;

  insert into public.request_access_tokens (
    booking_id, token_type, token_hash, revision_no, subject_email, expires_at
  ) values (
    target.id, 'requester_manage', p_manage_token_hash, next_revision,
    access_token.subject_email, p_manage_token_expires_at
  );

  if v_request_type = 'outside_company' then
    insert into public.request_access_tokens (
      booking_id, token_type, token_hash, revision_no, subject_email, expires_at
    ) values (
      target.id, 'approval', p_approval_token_hash, next_revision,
      lower(trim(p_request->>'approver_email')), p_approval_token_expires_at
    );
  end if;

  select to_jsonb(b)
    || jsonb_build_object(
      'booking_passengers', coalesce((
        select jsonb_agg(
          jsonb_build_object('name', bp.name, 'seq', bp.seq)
          order by bp.seq
        )
        from public.booking_passengers bp
        where bp.booking_id = b.id
      ), '[]'::jsonb),
      'overtime_employees', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'employee_id', oe.employee_id,
            'employee_name', oe.employee_name,
            'work_description', oe.work_description,
            'work_start', oe.work_start,
            'work_end', oe.work_end,
            'total_weekly_hours', oe.total_weekly_hours,
            'transport_required', oe.transport_required,
            'bus_stop', oe.bus_stop,
            'seq', oe.seq
          ) order by oe.seq
        )
        from public.overtime_employees oe
        where oe.booking_id = b.id
      ), '[]'::jsonb)
    )
  into request_snapshot
  from public.bookings b
  where b.id = target.id;

  insert into public.booking_revision_history (
    booking_id, revision_no, status, snapshot, change_source,
    changed_by_email, change_reason
  ) values (
    target.id, next_revision, next_status, request_snapshot,
    'requester_edit', target.requester_email,
    nullif(left(trim(coalesce(p_reason, '')), 1000), '')
  );

  return jsonb_build_object(
    'requestId', target.id,
    'requestNo', target.booking_no,
    'status', next_status,
    'revisionNo', next_revision,
    'workflowVersion', changed.workflow_version
  );
end;
$$;

revoke all on function public.execute_requester_change(
  text, text, jsonb, text, text, timestamptz, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.execute_requester_change(
  text, text, jsonb, text, text, timestamptz, text, timestamptz
) to service_role;

comment on function public.execute_requester_change(
  text, text, jsonb, text, text, timestamptz, text, timestamptz
) is 'Atomically validates a requester manage link and updates or cancels the linked request with revision history and token rotation.';

select pg_notify('pgrst', 'reload schema');

commit;
