-- Edge Functions use the service_role key, but explicit table privileges are
-- still required after earlier privilege hardening.
grant select on table public.booking_passengers to service_role;
grant select on table public.overtime_employees to service_role;
grant select, insert on table public.approvals to service_role;
