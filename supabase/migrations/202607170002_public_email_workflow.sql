begin;

-- Public requesters and email-only approvers do not need Supabase Auth accounts.
alter table public.bookings alter column requester_id drop not null;
alter table public.bookings
  add column if not exists requester_name text,
  add column if not exists requester_email text,
  add column if not exists requester_employee_id text,
  add column if not exists requester_department text,
  add column if not exists approval_email_status text not null default 'pending'
    check (approval_email_status in ('pending','sent','failed','not_configured')),
  add column if not exists requester_notification_status text not null default 'pending'
    check (requester_notification_status in ('pending','sent','failed','not_configured'));

update public.bookings b set
  requester_name = coalesce(b.requester_name, p.full_name),
  requester_email = coalesce(b.requester_email, p.email),
  requester_employee_id = coalesce(b.requester_employee_id, p.employee_id),
  requester_department = coalesce(b.requester_department, d.name)
from public.profiles p
left join public.departments d on d.id = p.department_id
where b.requester_id = p.id;

alter table public.bookings
  alter column requester_name set not null,
  alter column requester_email set not null,
  alter column requester_department set not null;

alter table public.approvals alter column approver_id drop not null;
alter table public.approvals
  add column if not exists approver_name text,
  add column if not exists approver_email text;
alter table public.approvals drop constraint if exists approvals_action_check;
alter table public.approvals add constraint approvals_action_check
  check (action in ('approved','rejected','changes_requested'));

create table if not exists public.public_request_attempts (
  id bigint generated always as identity primary key,
  fingerprint text not null,
  created_at timestamptz not null default now()
);
create index if not exists public_request_attempts_lookup_idx
  on public.public_request_attempts(fingerprint, created_at desc);
alter table public.public_request_attempts enable row level security;

-- Service-role Edge Functions own public inserts and email callbacks.
revoke all on public.public_request_attempts from anon, authenticated;
revoke insert, update, delete on public.bookings from anon;
revoke insert, update, delete on public.approvals from anon;

commit;
