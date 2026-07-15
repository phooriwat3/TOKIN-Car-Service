begin;

grant select, insert, update, delete
on table public.line_accounts, public.line_link_codes, public.line_notifications
to service_role;

select pg_notify('pgrst', 'reload schema');

commit;
