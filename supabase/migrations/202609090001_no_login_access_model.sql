-- Phase 2: no-Microsoft-login requester confirmation and signed-link access.

begin;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check (status in (
  'draft','pending_requester_confirmation','pending_approval',
  'pending_ot_verification','changes_requested','approved','rejected',
  'assigned','scheduled','in_progress','completed','cancelled'
));

alter table public.bookings
  add column if not exists requester_confirmed_at timestamptz,
  add column if not exists confirmation_delivery_status text not null default 'pending'
    check (confirmation_delivery_status in ('pending','sent','failed','not_configured'));

create index if not exists bookings_pending_requester_confirmation_idx
  on public.bookings (created_at)
  where status = 'pending_requester_confirmation';

alter table public.request_access_tokens
  drop constraint if exists request_access_tokens_token_type_check;
alter table public.request_access_tokens
  add constraint request_access_tokens_token_type_check
  check (token_type in (
    'requester_confirmation','approval','requester_manage','assignment_document'
  ));

create or replace function public.confirm_requester_request(
  p_token_hash text,
  p_manage_expires_at timestamptz,
  p_approval_token_hash text default null,
  p_approval_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  access_token public.request_access_tokens;
  target public.bookings;
  next_status text;
begin
  select * into access_token
  from public.request_access_tokens
  where token_hash = p_token_hash
    and token_type in ('requester_confirmation', 'requester_manage')
  for update;

  if access_token.id is null or access_token.revoked_at is not null then
    raise exception 'The confirmation link is invalid or no longer active.';
  end if;

  select * into target
  from public.bookings
  where id = access_token.booking_id
  for update;

  if target.id is null or target.revision_no <> access_token.revision_no then
    raise exception 'A newer version of this request exists.';
  end if;

  if access_token.used_at is not null
     or access_token.expires_at <= clock_timestamp() then
    raise exception 'The confirmation link has expired or was already used.';
  end if;

  if access_token.token_type = 'requester_manage'
     and target.status <> 'pending_requester_confirmation' then
    return jsonb_build_object(
      'outcome', 'already_confirmed',
      'booking_id', target.id,
      'request_no', target.booking_no,
      'status', target.status,
      'request_type', target.request_type
    );
  end if;

  if target.status <> 'pending_requester_confirmation' then
    raise exception 'The confirmation link has expired or was already used.';
  end if;

  if p_manage_expires_at <= clock_timestamp() then
    raise exception 'The management link expiry is invalid.';
  end if;

  next_status := case
    when target.request_type = 'overtime' then 'pending_ot_verification'
    else 'pending_approval'
  end;

  if target.request_type = 'outside_company'
     and (p_approval_token_hash is null or p_approval_expires_at is null
          or p_approval_expires_at <= clock_timestamp()) then
    raise exception 'Approval link details are required.';
  end if;

  -- The verified confirmation token becomes the requester management token.
  -- The raw token never needs to be returned by the public submission API.
  update public.request_access_tokens
  set token_type = 'requester_manage',
      expires_at = p_manage_expires_at,
      last_accessed_at = clock_timestamp()
  where id = access_token.id;

  if target.request_type = 'outside_company' then
    insert into public.request_access_tokens (
      booking_id, token_type, token_hash, revision_no, subject_email, expires_at
    ) values (
      target.id, 'approval', p_approval_token_hash, target.revision_no,
      target.approver_email, p_approval_expires_at
    );
  end if;

  update public.bookings
  set status = next_status,
      requester_confirmed_at = clock_timestamp(),
      requester_manage_email_status = 'pending',
      approval_email_status = case
        when request_type = 'outside_company' then 'pending'
        else 'not_configured'
      end,
      updated_at = clock_timestamp()
  where id = target.id;

  return jsonb_build_object(
    'outcome', 'confirmed',
    'booking_id', target.id,
    'request_no', target.booking_no,
    'status', next_status,
    'request_type', target.request_type
  );
end;
$$;

revoke all on function public.confirm_requester_request(text, timestamptz, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.confirm_requester_request(text, timestamptz, text, timestamptz)
  to service_role;

comment on function public.confirm_requester_request(text, timestamptz, text, timestamptz) is
  'Atomically confirms a public requester, activates the workflow, and converts the verified token into a management link.';

comment on column public.bookings.confirmation_delivery_status is
  'Delivery state for the requester confirmation message; no raw link is stored.';

commit;
