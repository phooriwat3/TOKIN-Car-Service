begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

select has_function(
  'public', 'admin_cancel_booking', array['uuid','text'],
  'GA cancellation command exists'
);
select ok(
  has_function_privilege('authenticated', 'public.admin_cancel_booking(uuid,text)', 'EXECUTE'),
  'authenticated staff can reach the role-checked cancellation command'
);
select ok(
  not has_function_privilege('anon', 'public.admin_cancel_booking(uuid,text)', 'EXECUTE'),
  'anonymous users cannot cancel operational requests'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '81000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'phase8.admin@yageo.com', '', now(),
    '{}'::jsonb, '{"full_name":"Phase 8 Admin","employee_id":"P8-ADM"}'::jsonb,
    now(), now()
  ),
  (
    '81000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'phase8.requester@yageo.com', '', now(),
    '{}'::jsonb, '{"full_name":"Phase 8 Requester","employee_id":"P8-REQ"}'::jsonb,
    now(), now()
  );

update public.profiles set role = 'admin'
where id = '81000000-0000-0000-0000-000000000001';

insert into public.vehicles (
  id, license_plate, brand, model, vehicle_type, capacity, year
) values (
  '81000000-0000-0000-0000-000000000003',
  'P8-9999', 'Toyota', 'Commuter', 'van', 10, 2025
);
insert into public.drivers (
  id, employee_id, full_name, phone, license_number, license_expiry
) values (
  '81000000-0000-0000-0000-000000000004',
  'P8-DRV', 'Phase 8 Driver', '0800000000', 'P8-LICENSE', current_date + 365
);

insert into public.bookings (
  id, booking_no, requester_id, department_id, status, category,
  using_date, start_time, end_time, pickup_location, destination, purpose,
  num_passengers, meeting_point, request_type, requester_name,
  requester_email, requester_department, revision_no
) values (
  '82000000-0000-0000-0000-000000000001',
  'CSR-PHASE8-000001', null,
  (select id from public.departments where code = 'UNASSIGNED'),
  'assigned', 'business_trip', current_date + 2, '08:00', '09:00',
  'TOKIN', 'Customer', 'GA cancellation test', 1, 'front_area',
  'outside_company', 'Phase 8 Requester', 'phase8.requester@yageo.com',
  'Unassigned', 1
);
insert into public.vehicle_assignments (
  booking_id, vehicle_id, driver_id, assigned_by, notes
) values (
  '82000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000003',
  '81000000-0000-0000-0000-000000000004',
  '81000000-0000-0000-0000-000000000001',
  'Phase 8 assignment'
);

create temporary table phase8_cancel_result (result jsonb);
grant select, insert on phase8_cancel_result to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000001","email":"phase8.admin@yageo.com"}', true);
insert into phase8_cancel_result
select public.admin_cancel_booking(
  '82000000-0000-0000-0000-000000000001',
  'Customer meeting was postponed.'
);
reset role;

select is(
  (select status from public.bookings where id = '82000000-0000-0000-0000-000000000001'),
  'cancelled',
  'GA command cancels the assigned request'
);
select is(
  (select reject_reason from public.bookings where id = '82000000-0000-0000-0000-000000000001'),
  'Customer meeting was postponed.',
  'the cancellation reason is retained'
);
select is(
  (select revision_no from public.bookings where id = '82000000-0000-0000-0000-000000000001'),
  2,
  'cancellation advances the request revision'
);
select is(
  (select count(*) from public.booking_revision_history
   where booking_id = '82000000-0000-0000-0000-000000000001' and status = 'cancelled'),
  1::bigint,
  'cancellation creates immutable revision history'
);
select is(
  (select count(*) from public.workflow_outbox
   where booking_id = '82000000-0000-0000-0000-000000000001'),
  2::bigint,
  'requester notification and driver follow-up are committed together'
);
select is(
  (select count(*) from public.vehicle_assignments
   where booking_id = '82000000-0000-0000-0000-000000000001'),
  1::bigint,
  'assignment evidence is preserved after cancellation'
);
select is(
  (select (result->>'driverCancellationRequired')::boolean from phase8_cancel_result),
  true,
  'command tells GA that a LINE withdrawal is required'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000001","email":"phase8.admin@yageo.com"}', true);
select is(
  public.record_driver_dispatch_event(
    array['82000000-0000-0000-0000-000000000001'::uuid],
    'phase8-unit', 'cancellation_sent'
  ),
  1,
  'GA can attest that the cancellation was sent in LINE'
);
reset role;

select is(
  (select action from public.driver_dispatch_events
   where booking_id = '82000000-0000-0000-0000-000000000001'
   order by created_at desc limit 1),
  'cancellation_sent',
  'driver withdrawal attestation is auditable'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$ select public.admin_cancel_booking(
    '82000000-0000-0000-0000-000000000001', 'Unauthorized retry.'
  ) $$,
  'Admin access required.',
  'non-admin users cannot execute a GA cancellation'
);
reset role;

select * from finish();
rollback;
