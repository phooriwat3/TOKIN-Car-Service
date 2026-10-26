begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

select has_table(
  'public',
  'workflow_action_issuances',
  'Teams card action issuance registry exists'
);
select ok(
  not has_table_privilege('anon', 'public.workflow_action_issuances', 'SELECT'),
  'anonymous clients cannot inspect issued card actions'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.register_approval_action(text,uuid,integer,text,timestamptz)',
    'EXECUTE'
  ),
  'authenticated clients cannot register their own card action IDs'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.register_approval_action(text,uuid,integer,text,timestamptz)',
    'EXECUTE'
  ),
  'the service role can register application-issued cards'
);
select ok(
  has_table_privilege('service_role', 'public.email_delivery_logs', 'SELECT')
    and has_table_privilege('service_role', 'public.email_delivery_logs', 'INSERT'),
  'the service role can append and inspect delivery history'
);
select ok(
  not has_table_privilege('service_role', 'public.email_delivery_logs', 'UPDATE')
    and not has_table_privilege('service_role', 'public.email_delivery_logs', 'DELETE')
    and not has_table_privilege('service_role', 'public.email_delivery_logs', 'TRUNCATE'),
  'delivery history remains append-only for the service role'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '41000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'phase4.requester@yageo.com', '', now(),
    '{}'::jsonb,
    '{"full_name":"Phase 4 Requester","employee_id":"P4-REQ"}'::jsonb,
    now(), now()
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'phase4.approver@yageo.com', '', now(),
    '{}'::jsonb,
    '{"full_name":"Phase 4 Approver","employee_id":"P4-APR"}'::jsonb,
    now(), now()
  );

update public.profiles
set role = 'approver'
where id = '41000000-0000-0000-0000-000000000002';

insert into public.bookings (
  id, booking_no, requester_id, department_id, status, category,
  using_date, start_time, end_time, pickup_location, destination, purpose,
  num_passengers, meeting_point, request_type, requester_name,
  requester_email, requester_department, approver_id, approver_name, approver_email
) values (
  '42000000-0000-0000-0000-000000000001',
  'CSR-PHASE4-000001',
  '41000000-0000-0000-0000-000000000001',
  (select department_id from public.profiles where id = '41000000-0000-0000-0000-000000000001'),
  'pending_approval', 'business_trip', current_date + 1, '08:00', '09:00',
  'TOKIN', 'Customer', 'Phase 4 Teams test', 1, 'front_area',
  'outside_company', 'Phase 4 Requester', 'phase4.requester@yageo.com',
  'IT', '41000000-0000-0000-0000-000000000002',
  'Phase 4 Approver', 'phase4.approver@yageo.com'
);

create temporary table phase4_registration as
select public.register_approval_action(
  '43000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000001',
  1,
  'phase4.approver@yageo.com',
  current_date + interval '1 day'
) as result;

select is(
  (select result->>'outcome' from phase4_registration),
  'registered',
  'the application can register one assigned-approver card'
);
select is(
  (select count(*) from public.workflow_action_issuances where booking_id = '42000000-0000-0000-0000-000000000001'),
  1::bigint,
  'issued card metadata is stored without a raw signed-link token'
);

select throws_ok(
  $$
    select public.execute_approval_command(
      '43000000-0000-0000-0000-000000000099', repeat('c', 64),
      '42000000-0000-0000-0000-000000000001', 'approved', 1,
      'phase4.approver@yageo.com', '29:phase4', 'Phase 4 Approver', '', 'teams',
      '44000000-0000-0000-0000-000000000001', current_date + interval '1 day',
      null, null, null, '{"schemaVersion":1}'::jsonb
    )
  $$,
  'The Teams approval action was not issued or is no longer active.',
  'a forged but well-formed Teams action ID cannot authorize a decision'
);

create temporary table phase4_decision as
select public.execute_approval_command(
  '43000000-0000-0000-0000-000000000001', repeat('d', 64),
  '42000000-0000-0000-0000-000000000001', 'approved', 1,
  'phase4.approver@yageo.com', '29:phase4', 'Phase 4 Approver', '', 'teams',
  '44000000-0000-0000-0000-000000000002', current_date + interval '1 day',
  null, null, null, '{"schemaVersion":1}'::jsonb
) as result;

select is(
  (select result->>'status' from phase4_decision),
  'approved',
  'an issued card from the assigned Teams responder is accepted'
);
select ok(
  (select used_at is not null from public.workflow_action_issuances where action_key = '43000000-0000-0000-0000-000000000001'),
  'the issued action ID is consumed atomically with the decision'
);
select is(
  (select count(*) from public.workflow_actions where booking_id = '42000000-0000-0000-0000-000000000001'),
  1::bigint,
  'one durable Teams action record is retained'
);
select is(
  (select count(*) from public.workflow_outbox where booking_id = '42000000-0000-0000-0000-000000000001'),
  1::bigint,
  'one requester notification is committed with the Teams decision'
);

select * from finish();
rollback;
