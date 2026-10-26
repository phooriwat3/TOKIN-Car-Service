begin;

create or replace function public.health_check()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true;
$$;

revoke all on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated, service_role;

commit;
