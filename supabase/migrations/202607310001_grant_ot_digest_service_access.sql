begin;

-- The scheduled digest runs with the service-role client and must be able to
-- resolve each department and its active approvers before sending email.
grant usage on schema public to service_role;
grant select on table public.department_approvers to service_role;
grant select on table public.departments to service_role;
grant select on table public.profiles to service_role;

-- Department batches may be sent to more than one active approver. Keep one
-- live approval link per approver instead of one link for the entire booking.
drop index if exists public.request_access_tokens_one_active_type_idx;
create unique index if not exists request_access_tokens_one_active_subject_idx
  on public.request_access_tokens (booking_id, token_type, lower(subject_email))
  where used_at is null and revoked_at is null;

commit;
