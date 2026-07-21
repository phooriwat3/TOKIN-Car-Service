begin;

alter table public.request_access_tokens
  drop constraint if exists request_access_tokens_token_type_check;

alter table public.request_access_tokens
  add constraint request_access_tokens_token_type_check
  check (token_type in ('approval', 'requester_manage', 'assignment_document'));

create or replace function public.revoke_stale_request_tokens()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.revision_no > old.revision_no then
    update public.request_access_tokens
    set revoked_at = coalesce(revoked_at, now())
    where booking_id = new.id
      and revision_no < new.revision_no
      and used_at is null
      and revoked_at is null;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'changes_requested' then
      update public.request_access_tokens
      set revoked_at = coalesce(revoked_at, now())
      where booking_id = new.id
        and token_type = 'approval'
        and used_at is null
        and revoked_at is null;
    elsif new.status in ('rejected', 'cancelled') then
      update public.request_access_tokens
      set revoked_at = coalesce(revoked_at, now())
      where booking_id = new.id
        and used_at is null
        and revoked_at is null;
    elsif new.status in ('approved', 'assigned', 'scheduled', 'in_progress', 'completed') then
      update public.request_access_tokens
      set revoked_at = coalesce(revoked_at, now())
      where booking_id = new.id
        and token_type in ('approval', 'requester_manage')
        and used_at is null
        and revoked_at is null;
    end if;
  end if;

  return new;
end;
$$;

comment on table public.request_access_tokens is
  'SHA-256 hashes for expiring approval, requester management, and assignment document links.';

commit;
