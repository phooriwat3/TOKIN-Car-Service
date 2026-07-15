begin;

-- The assignment notification Edge Function runs with the service-role client.
-- Service-role bypasses RLS, but it still needs table-level privileges.
grant select
on table
  public.bookings,
  public.vehicle_assignments,
  public.drivers,
  public.vehicles
to service_role;

select pg_notify('pgrst', 'reload schema');

commit;
