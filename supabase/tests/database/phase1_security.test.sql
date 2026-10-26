begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  role_id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  role_name || '@tokin.test',
  '',
  now(),
  '{}'::jsonb,
  jsonb_build_object('full_name', initcap(role_name), 'employee_id', 'TEST-' || role_name),
  now(),
  now()
from (
  values
    ('10000000-0000-0000-0000-000000000001'::uuid, 'requester'),
    ('10000000-0000-0000-0000-000000000002'::uuid, 'approver'),
    ('10000000-0000-0000-0000-000000000003'::uuid, 'admin'),
    ('10000000-0000-0000-0000-000000000004'::uuid, 'driver'),
    ('10000000-0000-0000-0000-000000000005'::uuid, 'finance'),
    ('10000000-0000-0000-0000-000000000006'::uuid, 'executive'),
    ('10000000-0000-0000-0000-000000000007'::uuid, 'auditor')
) as roles(role_id, role_name);

update public.profiles p
set role = split_part(p.email, '@', 1)
where p.email like '%@tokin.test';

select is(
  (select count(distinct role) from public.profiles where email like '%@tokin.test'),
  7::bigint,
  'all seven application roles are accepted by the database'
);

insert into public.archived_bookings (
  id, booking_no, requester_id, requester_name, requester_email,
  requester_employee_id, department, status, category, request_type,
  using_date, start_time, end_time, pickup_location, destination, purpose,
  num_passengers, booking_snapshot, created_at
) values (
  '20000000-0000-0000-0000-000000000001',
  'CSR-TEST-000001',
  '10000000-0000-0000-0000-000000000001',
  'Requester',
  'requester@tokin.test',
  'TEST-requester',
  'IT',
  'completed',
  'business_trip',
  'outside_company',
  current_date - 100,
  '08:00',
  '09:00',
  'TOKIN',
  'Customer',
  'RLS test',
  1,
  '{}'::jsonb,
  now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.profiles), 1::bigint, 'requester sees only own profile');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.profiles where email like '%@tokin.test'), 7::bigint, 'admin sees the profile directory');
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","user_metadata":{"role":"admin"}}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is(public.app_role(), 'requester', 'user metadata cannot elevate the database role');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.archived_bookings), 0::bigint, 'requester cannot read archives');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.archived_bookings), 0::bigint, 'approver cannot read archives');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.archived_bookings), 1::bigint, 'admin can read archives');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.archived_bookings), 0::bigint, 'driver cannot read archives');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select is((select count(*) from public.archived_bookings), 1::bigint, 'finance can read archives');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000006', true);
select is((select count(*) from public.archived_bookings), 1::bigint, 'executive can read archives');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000007', true);
select is((select count(*) from public.archived_bookings), 1::bigint, 'auditor can read archives');
reset role;

select ok(
  not has_table_privilege('anon', 'public.archived_bookings', 'SELECT'),
  'anonymous users have no archive table privilege'
);
select ok(
  not has_table_privilege('anon', 'public.employee_transport_directory', 'SELECT'),
  'anonymous users have no employee directory table privilege'
);
select ok(
  not has_function_privilege('anon', 'public.archive_cold_bookings(integer)', 'EXECUTE'),
  'anonymous users cannot run archival'
);
select ok(
  not has_function_privilege('authenticated', 'public.archive_cold_bookings(integer)', 'EXECUTE'),
  'authenticated users cannot run archival'
);
select ok(
  has_function_privilege('service_role', 'public.archive_cold_bookings(integer)', 'EXECUTE'),
  'service role can run archival'
);
select ok(
  not has_table_privilege('authenticated', 'public.audit_logs', 'INSERT'),
  'authenticated users cannot insert audit records directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.api_idempotency_records', 'SELECT'),
  'authenticated users cannot read idempotency records'
);
select ok(
  not has_function_privilege('anon', 'public.consume_rate_limit(text,integer,integer)', 'EXECUTE'),
  'anonymous users cannot invoke the service rate limiter'
);

select * from finish();
rollback;
