-- The application uses daily manual transport units on each booking. Legacy
-- vehicle and driver master records may be cleared only after booking history
-- has been removed, so existing assignments can never be orphaned.
create or replace function public.delete_all_fleet_resources(p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_vehicles integer;
  deleted_drivers integer;
begin
  if public.app_role() <> 'admin' then
    raise exception 'Admin role required.';
  end if;

  if p_confirmation <> 'DELETE ALL FLEET RESOURCES' then
    raise exception 'Confirmation phrase does not match.';
  end if;

  if exists (select 1 from public.bookings) then
    raise exception 'Delete all bookings before clearing fleet resources.';
  end if;

  delete from public.drivers where id is not null;
  get diagnostics deleted_drivers = row_count;
  delete from public.vehicles where id is not null;
  get diagnostics deleted_vehicles = row_count;

  return jsonb_build_object(
    'vehicles', deleted_vehicles,
    'drivers', deleted_drivers
  );
end;
$$;

revoke all on function public.delete_all_fleet_resources(text) from public;
grant execute on function public.delete_all_fleet_resources(text) to authenticated;
