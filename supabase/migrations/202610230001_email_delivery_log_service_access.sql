-- Edge Functions append delivery outcomes with the service role. Keep this
-- operational history append-only: the runtime may read and insert records,
-- but it cannot rewrite or delete existing evidence.
begin;

grant select, insert on table public.email_delivery_logs to service_role;
revoke update, delete, truncate on table public.email_delivery_logs from service_role;

commit;
