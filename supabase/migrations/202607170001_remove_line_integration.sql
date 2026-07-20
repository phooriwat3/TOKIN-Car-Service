begin;

-- Remove the retired LINE integration after the email workflow replaced it.
drop function if exists public.line_accept_assignment(uuid, uuid);
drop function if exists public.line_start_trip(uuid, uuid, timestamptz, numeric);
drop function if exists public.line_complete_trip(uuid, uuid, timestamptz, numeric, numeric, numeric, numeric, text);
drop function if exists public.create_driver_line_link_code(uuid);
drop function if exists public.disconnect_driver_line_account(uuid);
drop function if exists public.create_line_link_code();
drop function if exists public.disconnect_line_account();

drop table if exists public.driver_line_link_codes cascade;
drop table if exists public.driver_line_accounts cascade;
drop table if exists public.line_link_codes cascade;
drop table if exists public.line_accounts cascade;
drop table if exists public.line_notifications cascade;

select pg_notify('pgrst', 'reload schema');

commit;