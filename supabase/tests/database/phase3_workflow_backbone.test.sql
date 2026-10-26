begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

select has_column('public', 'bookings', 'workflow_version', 'bookings have a workflow concurrency version');
select has_table('public', 'workflow_actions', 'workflow action evidence exists');
select has_table('public', 'workflow_outbox', 'transactional workflow outbox exists');
select has_table('public', 'workflow_deliveries', 'delivery attempt history exists');
select has_table('public', 'workflow_actor_mappings', 'optional Teams identity mappings exist');

select ok(
  not has_table_privilege('anon', 'public.workflow_outbox', 'SELECT'),
  'anonymous clients cannot read outbox payloads'
);
select ok(
  not has_table_privilege('authenticated', 'public.workflow_outbox', 'SELECT'),
  'authenticated clients cannot read expiring links from outbox payloads'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.execute_approval_command(text,text,uuid,text,integer,text,text,text,text,text,uuid,timestamptz,text,text,timestamptz,jsonb)',
    'EXECUTE'
  ),
  'only the service command path can execute approval transitions'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.process_approval_callback(uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'the legacy approval bypass is disabled'
);
select ok(
  not has_function_privilege('anon', 'public.admin_retry_workflow_delivery(uuid)', 'EXECUTE'),
  'anonymous clients cannot retry workflow deliveries'
);
select ok(
  has_function_privilege('authenticated', 'public.admin_retry_workflow_delivery(uuid)', 'EXECUTE'),
  'authenticated admins can reach the role-checked retry command'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '31000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'phase3.requester@yageo.com', '', now(),
    '{}'::jsonb,
    '{"full_name":"Phase 3 Requester","employee_id":"P3-REQ"}'::jsonb,
    now(), now()
  ),
  (
    '31000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'phase3.approver@yageo.com', '', now(),
    '{}'::jsonb,
    '{"full_name":"Phase 3 Approver","employee_id":"P3-APR"}'::jsonb,
    now(), now()
  );

update public.profiles
set role = 'approver'
where id = '31000000-0000-0000-0000-000000000002';

insert into public.bookings (
  id, booking_no, requester_id, department_id, status, category,
  using_date, start_time, end_time, pickup_location, destination, purpose,
  num_passengers, meeting_point, request_type, requester_name,
  requester_email, requester_department, approver_id, approver_name, approver_email
) values (
  '32000000-0000-0000-0000-000000000001',
  'CSR-PHASE3-000001',
  '31000000-0000-0000-0000-000000000001',
  (select department_id from public.profiles where id = '31000000-0000-0000-0000-000000000001'),
  'pending_approval', 'business_trip', current_date + 1, '08:00', '09:00',
  'TOKIN', 'Customer', 'Phase 3 workflow test', 1, 'front_area',
  'outside_company', 'Phase 3 Requester', 'phase3.requester@yageo.com',
  'IT', '31000000-0000-0000-0000-000000000002',
  'Phase 3 Approver', 'phase3.approver@yageo.com'
);

insert into public.request_access_tokens (
  booking_id, token_type, token_hash, revision_no, subject_email, expires_at
) values (
  '32000000-0000-0000-0000-000000000001', 'approval', repeat('b', 64), 1,
  'phase3.approver@yageo.com', now() + interval '1 hour'
);

create temporary table phase3_first_result as
select public.execute_approval_command(
  'signed-link:' || repeat('b', 64), repeat('a', 64),
  '32000000-0000-0000-0000-000000000001', 'approved', 1,
  'phase3.approver@yageo.com', null, 'Phase 3 Approver', '', 'signed_link',
  '33000000-0000-0000-0000-000000000001', now() + interval '1 hour',
  repeat('b', 64), null, null, '{"schemaVersion":1}'::jsonb
) as result;

select is(
  (select result->>'status' from phase3_first_result),
  'approved',
  'the explicit approval command applies the transition'
);
select is(
  (select status from public.bookings where id = '32000000-0000-0000-0000-000000000001'),
  'approved',
  'booking state is updated atomically'
);
select is(
  (select workflow_version from public.bookings where id = '32000000-0000-0000-0000-000000000001'),
  2,
  'workflow version advances once'
);
select is(
  (select count(*) from public.workflow_actions where booking_id = '32000000-0000-0000-0000-000000000001'),
  1::bigint,
  'one idempotent action record is stored'
);
select is(
  (select count(*) from public.workflow_outbox where booking_id = '32000000-0000-0000-0000-000000000001'),
  1::bigint,
  'the state change and notification are committed together'
);

create temporary table phase3_retry_result as
select public.execute_approval_command(
  'signed-link:' || repeat('b', 64), repeat('a', 64),
  '32000000-0000-0000-0000-000000000001', 'approved', 1,
  'phase3.approver@yageo.com', null, 'Phase 3 Approver', '', 'signed_link',
  '33000000-0000-0000-0000-000000000002', now() + interval '1 hour',
  repeat('b', 64), null, null, '{"schemaVersion":1}'::jsonb
) as result;

select is(
  (select (result->>'alreadyProcessed')::boolean from phase3_retry_result),
  true,
  'a duplicate action returns idempotent success'
);
select is(
  (select count(*) from public.approvals where booking_id = '32000000-0000-0000-0000-000000000001'),
  1::bigint,
  'a duplicate action cannot create a second decision'
);

select * from finish();
rollback;
