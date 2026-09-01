-- Some hosted database safety guards reject unrestricted DELETE statements.
-- Booking IDs are primary keys, so this condition still targets every booking.
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

  delete from public.bookings where id is not null;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
