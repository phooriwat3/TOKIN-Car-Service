-- Phase 4: register every Teams approval card before it can authorize a command.
begin;

alter table public.email_delivery_logs
  drop constraint if exists email_delivery_logs_status_check;
alter table public.email_delivery_logs
  add constraint email_delivery_logs_status_check
  check (status in ('queued','sent','failed','not_configured'));

create table public.workflow_action_issuances (
  action_key text primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  action_type text not null check (action_type in ('approval')),
  expected_version integer not null check (expected_version > 0),
  subject_email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  check (length(action_key) between 8 and 200),
  check (length(trim(subject_email)) between 3 and 240),
  check (expires_at > created_at)
);

create index workflow_action_issuances_booking_idx
  on public.workflow_action_issuances (booking_id, created_at desc);
create index workflow_action_issuances_active_expiry_idx
  on public.workflow_action_issuances (expires_at)
  where used_at is null and revoked_at is null;

alter table public.workflow_action_issuances enable row level security;
revoke all on public.workflow_action_issuances from public, anon, authenticated;
grant select, insert, update on public.workflow_action_issuances to service_role;

create or replace function public.register_approval_action(
  p_action_key text,
  p_booking_id uuid,
  p_expected_version integer,
  p_subject_email text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.bookings;
  normalized_email text := lower(trim(coalesce(p_subject_email, '')));
  existing public.workflow_action_issuances;
begin
  if length(trim(coalesce(p_action_key, ''))) not between 8 and 200 then
    raise exception 'Action key is invalid.';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'Expected workflow version is invalid.';
  end if;
  if p_expires_at is null or p_expires_at <= clock_timestamp() then
    raise exception 'Approval card expiration is invalid.';
  end if;

  select * into target
  from public.bookings
  where id = p_booking_id
  for update;

  if target.id is null then raise exception 'Request not found.'; end if;
  if target.status <> 'pending_approval' then
    raise exception 'Request is not awaiting approval.';
  end if;
  if target.workflow_version <> p_expected_version then
    raise exception 'The request changed before the approval card was issued.';
  end if;
  if target.request_type <> 'outside_company'
     or lower(trim(coalesce(target.approver_email, ''))) <> normalized_email
     or not exists (
       select 1 from public.profiles p
       where p.id = target.approver_id
         and p.role = 'approver'
         and p.is_active
         and lower(trim(p.email)) = normalized_email
     ) then
    raise exception 'The approval card recipient is not the active assigned approver.';
  end if;

  select * into existing
  from public.workflow_action_issuances
  where action_key = trim(p_action_key)
  for update;

  if existing.action_key is not null then
    if existing.booking_id = target.id
       and existing.expected_version = p_expected_version
       and lower(trim(existing.subject_email)) = normalized_email
       and existing.expires_at = p_expires_at then
      return jsonb_build_object(
        'actionId', existing.action_key,
        'outcome', 'already_registered'
      );
    end if;
    raise exception 'Action key is already registered for different card data.';
  end if;

  insert into public.workflow_action_issuances (
    action_key, booking_id, action_type, expected_version, subject_email, expires_at
  ) values (
    trim(p_action_key), target.id, 'approval', p_expected_version,
    normalized_email, p_expires_at
  );

  return jsonb_build_object(
    'actionId', trim(p_action_key),
    'outcome', 'registered'
  );
end;
$$;

create or replace function public.enforce_issued_workflow_action()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  issuance public.workflow_action_issuances;
begin
  if new.source <> 'teams' then return new; end if;

  select * into issuance
  from public.workflow_action_issuances
  where action_key = new.action_key
  for update;

  if issuance.action_key is null
     or issuance.action_type <> 'approval'
     or issuance.booking_id <> new.booking_id
     or issuance.expected_version <> new.expected_version
     or lower(trim(issuance.subject_email)) <> lower(trim(new.actor_email))
     or issuance.expires_at <> new.expires_at
     or issuance.expires_at <= clock_timestamp()
     or issuance.used_at is not null
     or issuance.revoked_at is not null then
    raise exception 'The Teams approval action was not issued or is no longer active.';
  end if;

  update public.workflow_action_issuances
  set used_at = clock_timestamp()
  where action_key = issuance.action_key;

  return new;
end;
$$;

drop trigger if exists enforce_issued_workflow_action on public.workflow_actions;
create trigger enforce_issued_workflow_action
before insert on public.workflow_actions
for each row execute function public.enforce_issued_workflow_action();

create or replace function public.revoke_stale_workflow_action_issuances()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     or new.workflow_version is distinct from old.workflow_version then
    update public.workflow_action_issuances
    set revoked_at = coalesce(revoked_at, clock_timestamp())
    where booking_id = new.id
      and used_at is null
      and revoked_at is null
      and (
        new.status <> 'pending_approval'
        or expected_version <> new.workflow_version
      );
  end if;
  return new;
end;
$$;

drop trigger if exists revoke_stale_workflow_action_issuances on public.bookings;
create trigger revoke_stale_workflow_action_issuances
after update of status, workflow_version on public.bookings
for each row execute function public.revoke_stale_workflow_action_issuances();

revoke all on function public.register_approval_action(text, uuid, integer, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.register_approval_action(text, uuid, integer, text, timestamptz)
  to service_role;
revoke all on function public.enforce_issued_workflow_action() from public;
revoke all on function public.revoke_stale_workflow_action_issuances() from public;

comment on table public.workflow_action_issuances is
  'Service-only registry of card action IDs issued to a specific booking version and approver.';

commit;
