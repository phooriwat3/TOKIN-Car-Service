begin;

-- Public requesters and email-only approvers use signed links instead of
-- Supabase Auth accounts. Raw tokens must never be stored in the database;
-- Edge Functions hash them with SHA-256 before inserting or looking them up.
alter table public.bookings
  add column if not exists revision_no integer not null default 1
    check (revision_no > 0),
  add column if not exists last_submitted_at timestamptz not null default now(),
  add column if not exists requester_manage_email_status text not null default 'pending'
    check (requester_manage_email_status in ('pending','sent','failed','not_configured'));

create table if not exists public.request_access_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  token_type text not null
    check (token_type in ('approval','requester_manage')),
  token_hash text not null unique
    check (token_hash ~ '^[0-9a-f]{64}$'),
  revision_no integer not null check (revision_no > 0),
  subject_email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint request_access_tokens_expiry_valid
    check (expires_at > created_at),
  constraint request_access_tokens_usage_valid
    check (used_at is null or used_at >= created_at),
  constraint request_access_tokens_revocation_valid
    check (revoked_at is null or revoked_at >= created_at)
);

-- A request may have only one currently usable token of each type. Creating a
-- replacement requires revoking the previous token first.
create unique index if not exists request_access_tokens_one_active_type_idx
  on public.request_access_tokens (booking_id, token_type)
  where used_at is null and revoked_at is null;

create index if not exists request_access_tokens_lookup_idx
  on public.request_access_tokens (token_hash, token_type);

create index if not exists request_access_tokens_booking_idx
  on public.request_access_tokens (booking_id, revision_no, created_at desc);

create index if not exists request_access_tokens_expiry_idx
  on public.request_access_tokens (expires_at)
  where used_at is null and revoked_at is null;

create table if not exists public.booking_revision_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  revision_no integer not null check (revision_no > 0),
  status text not null,
  snapshot jsonb not null,
  change_source text not null
    check (change_source in (
      'initial_submission',
      'requester_edit',
      'approver_request_changes',
      'admin_update',
      'system'
    )),
  changed_by_email text,
  change_reason text,
  created_at timestamptz not null default now(),
  unique (booking_id, revision_no)
);

create index if not exists booking_revision_history_booking_idx
  on public.booking_revision_history (booking_id, revision_no desc);

-- Seed revision 1 for historical requests. Future Edge Functions replace the
-- system snapshot with richer request, passenger, and OT employee data.
insert into public.booking_revision_history (
  booking_id,
  revision_no,
  status,
  snapshot,
  change_source,
  changed_by_email,
  created_at
)
select
  b.id,
  b.revision_no,
  b.status,
  to_jsonb(b),
  'system',
  b.requester_email,
  b.created_at
from public.bookings b
on conflict (booking_id, revision_no) do nothing;

alter table public.request_access_tokens enable row level security;
alter table public.booking_revision_history enable row level security;

-- Tokens and snapshots contain sensitive information and are available only
-- through service-role Edge Functions. They are never exposed through Data API
-- roles directly.
revoke all on public.request_access_tokens from anon, authenticated;
revoke all on public.booking_revision_history from anon, authenticated;

grant select, insert, update, delete on public.request_access_tokens to service_role;
grant select, insert on public.booking_revision_history to service_role;
grant select, update on public.bookings to service_role;

create or replace function public.revoke_stale_request_tokens()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Once a new revision is submitted, every link issued for an older revision
  -- becomes invalid. Edge Functions then issue fresh links for the new version.
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
    elsif new.status in (
      'approved','rejected','cancelled','assigned','scheduled',
      'in_progress','completed'
    ) then
      update public.request_access_tokens
      set revoked_at = coalesce(revoked_at, now())
      where booking_id = new.id
        and used_at is null
        and revoked_at is null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists revoke_stale_request_tokens on public.bookings;
create trigger revoke_stale_request_tokens
after update of revision_no, status on public.bookings
for each row execute function public.revoke_stale_request_tokens();

revoke all on function public.revoke_stale_request_tokens() from public;

comment on table public.request_access_tokens is
  'SHA-256 hashes for expiring approval and requester management links.';
comment on table public.booking_revision_history is
  'Immutable snapshots of each submitted request revision.';
comment on column public.bookings.revision_no is
  'Current submitted revision; incremented for every requester resubmission.';

commit;
