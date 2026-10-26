begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

select has_function(
  'public',
  'health_check',
  array[]::text[],
  'data-free database health function exists'
);

select ok(
  has_function_privilege('anon', 'public.health_check()', 'EXECUTE'),
  'anonymous monitoring probe may execute health_check'
);

select is(
  public.health_check(),
  true,
  'database health function reports ready'
);

select * from finish();

rollback;
