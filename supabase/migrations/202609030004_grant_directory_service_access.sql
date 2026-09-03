-- The server-side directory services use the service role, which needs explicit table privileges.
grant select, insert, update, delete on public.employee_transport_directory to service_role;
