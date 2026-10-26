begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

select has_column(
  'public',
  'bookings',
  'requester_confirmed_at',
  'bookings records requester confirmation time'
);

select has_column(
  'public',
  'bookings',
  'confirmation_delivery_status',
  'bookings records confirmation delivery state'
);

select ok(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and conname = 'bookings_status_check'
  ) like '%pending_requester_confirmation%',
  'booking workflow permits the requester confirmation state'
);

select ok(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.request_access_tokens'::regclass
      and conname = 'request_access_tokens_token_type_check'
  ) like '%requester_confirmation%',
  'signed-link tokens permit requester confirmation links'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.confirm_requester_request(text,timestamptz,text,timestamptz)',
    'EXECUTE'
  ),
  'anonymous database users cannot confirm requests directly'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.confirm_requester_request(text,timestamptz,text,timestamptz)',
    'EXECUTE'
  ),
  'authenticated clients cannot bypass the signed-link confirmation endpoint'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.confirm_requester_request(text,timestamptz,text,timestamptz)',
    'EXECUTE'
  ),
  'the service role can run the confirmation command'
);

select * from finish();
rollback;
