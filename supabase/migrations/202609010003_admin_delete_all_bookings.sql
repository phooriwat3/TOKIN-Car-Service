-- Controlled administrative data reset. This is intentionally available only
-- through an explicit RPC with a typed confirmation phrase.
create or replace function public.delete_all_bookings(p_confirmation text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if public.app_role() <> 'admin' then
    raise exception 'Admin role required.';
  end if;

  if p_confirmation <> 'DELETE ALL BOOKINGS' then
    raise exception 'Confirmation phrase does not match.';
  end if;

  delete from public.bookings;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_all_bookings(text) from public;
grant execute on function public.delete_all_bookings(text) to authenticated;
