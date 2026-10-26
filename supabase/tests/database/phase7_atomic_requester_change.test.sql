begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

select has_function(
  'public',
  'execute_requester_change',
  array['text','text','jsonb','text','text','timestamp with time zone','text','timestamp with time zone'],
  'atomic requester command exists'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.execute_requester_change(text,text,jsonb,text,text,timestamptz,text,timestamptz)',
    'EXECUTE'
  ),
  'service role can execute requester changes'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.execute_requester_change(text,text,jsonb,text,text,timestamptz,text,timestamptz)',
    'EXECUTE'
  ),
  'anonymous clients cannot execute requester changes directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.execute_requester_change(text,text,jsonb,text,text,timestamptz,text,timestamptz)',
    'EXECUTE'
  ),
  'authenticated clients cannot bypass the Edge Function'
);

insert into public.departments (id, name, code)
values ('71000000-0000-0000-0000-000000000001', 'Phase 7', 'PHASE7');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '71000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'phase7.approver@yageo.com', '', now(),
  '{}'::jsonb,
  '{"full_name":"Phase 7 Approver","employee_id":"P7-APR"}'::jsonb,
  now(), now()
);

update public.profiles
set role = 'approver', department_id = '71000000-0000-0000-0000-000000000001'
where id = '71000000-0000-0000-0000-000000000002';

insert into public.bookings (
  id, booking_no, requester_id, department_id, status, category,
  using_date, start_time, end_time, pickup_location, destination, purpose,
  num_passengers, meeting_point, request_type, requester_name,
  requester_email, requester_department, approver_id, approver_name,
  approver_email, revision_no
) values (
  '72000000-0000-0000-0000-000000000001',
  'CSR-PHASE7-000001', null,
  '71000000-0000-0000-0000-000000000001',
  'changes_requested', 'business_trip', current_date + 2, '08:00', '09:00',
  'Old pickup', 'Old destination', 'Old purpose', 1, 'front_area',
  'outside_company', 'Phase 7 Requester', 'phase7.requester@yageo.com',
  'Phase 7', '71000000-0000-0000-0000-000000000002',
  'Phase 7 Approver', 'phase7.approver@yageo.com', 1
);

insert into public.booking_passengers (booking_id, name, seq)
values ('72000000-0000-0000-0000-000000000001', 'Old Passenger', 0);

insert into public.request_access_tokens (
  booking_id, token_type, token_hash, revision_no, subject_email, expires_at
) values (
  '72000000-0000-0000-0000-000000000001', 'requester_manage',
  repeat('a', 64), 1, 'phase7.requester@yageo.com', now() + interval '1 day'
);

create temporary table phase7_update_result as
select public.execute_requester_change(
  repeat('a', 64),
  'update',
  jsonb_build_object(
    'requester_name', 'Phase 7 Requester',
    'requester_employee_id', 'P7-REQ',
    'requester_department', 'Phase 7',
    'department_id', '71000000-0000-0000-0000-000000000001',
    'approver_id', '71000000-0000-0000-0000-000000000002',
    'approver_name', 'Phase 7 Approver',
    'approver_email', 'phase7.approver@yageo.com',
    'request_type', 'outside_company',
    'using_date', (current_date + 3)::text,
    'start_time', '10:00',
    'end_time', '11:30',
    'pickup_location', 'TOKIN Gate',
    'destination', 'Customer Site',
    'purpose', 'Atomic update test',
    'num_passengers', 2,
    'meeting_point', 'front_area',
    'with_staff', true,
    'urgent', false,
    'urgent_reason', null,
    'passengers', jsonb_build_array('Passenger One', 'Passenger Two'),
    'overtime_employees', '[]'::jsonb
  ),
  'Corrected destination.',
  repeat('b', 64), now() + interval '30 days',
  repeat('c', 64), now() + interval '7 days'
) as result;

select is(
  (select result->>'status' from phase7_update_result),
  'pending_approval',
  'update returns the next workflow status'
);
select is(
  (select revision_no from public.bookings where id = '72000000-0000-0000-0000-000000000001'),
  2,
  'booking revision advances once'
);
select is(
  (select destination from public.bookings where id = '72000000-0000-0000-0000-000000000001'),
  'Customer Site',
  'booking values are updated'
);
select is(
  (select count(*) from public.booking_passengers where booking_id = '72000000-0000-0000-0000-000000000001'),
  2::bigint,
  'dependent passenger rows are replaced in the command'
);
select ok(
  (select revoked_at is not null from public.request_access_tokens where token_hash = repeat('a', 64)),
  'the previous manage token is revoked'
);
select ok(
  (select revoked_at is null from public.request_access_tokens where token_hash = repeat('b', 64)),
  'the replacement manage token is active'
);
select ok(
  (select revoked_at is null from public.request_access_tokens where token_hash = repeat('c', 64)),
  'the replacement approval token is active'
);
select is(
  (select jsonb_array_length(snapshot->'booking_passengers')
   from public.booking_revision_history
   where booking_id = '72000000-0000-0000-0000-000000000001' and revision_no = 2),
  2,
  'revision history contains the committed passenger snapshot'
);
select is(
  (select change_reason from public.booking_revision_history
   where booking_id = '72000000-0000-0000-0000-000000000001' and revision_no = 2),
  'Corrected destination.',
  'revision history records the requester reason'
);

create temporary table phase7_cancel_result as
select public.execute_requester_change(
  repeat('b', 64), 'cancel', null, null, null, null, null, null
) as result;

select is(
  (select result->>'status' from phase7_cancel_result),
  'cancelled',
  'cancellation returns the terminal status'
);
select is(
  (select status from public.bookings where id = '72000000-0000-0000-0000-000000000001'),
  'cancelled',
  'cancellation updates the booking atomically'
);
select is(
  (select revision_no from public.bookings where id = '72000000-0000-0000-0000-000000000001'),
  3,
  'cancellation creates a new revision'
);
select is(
  (select count(*) from public.request_access_tokens
   where booking_id = '72000000-0000-0000-0000-000000000001'
     and used_at is null and revoked_at is null),
  0::bigint,
  'cancellation revokes every active request token'
);

select * from finish();
rollback;
