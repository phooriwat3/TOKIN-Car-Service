begin;

-- Department master used by the public request form and approver portal.
insert into public.departments (name, code)
values
  ('Managing Director', 'MD'),
  ('Human Resources', 'HR'),
  ('Sustainability', 'SUST'),
  ('Finance and Accounting', 'FA'),
  ('Planning', 'PLN'),
  ('Procurement', 'PROC'),
  ('Process Engineering', 'PE'),
  ('Information Technology', 'IT'),
  ('Electrical Engineering', 'EE'),
  ('Facilities', 'FAC'),
  ('Quality Assurance', 'QA'),
  ('TA Manufacturing', 'TA MFG'),
  ('Supply Chain', 'SC'),
  ('Test Engineering', 'TE')
on conflict (code) do update set name = excluded.name, is_active = true, updated_at = now();

-- A department may have one or more approvers. In this phase, one decision from
-- any active department approver completes the request.
create table if not exists public.department_approvers (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  approver_id uuid not null references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, approver_id)
);

create index if not exists department_approvers_department_idx
  on public.department_approvers(department_id) where is_active;
create index if not exists department_approvers_approver_idx
  on public.department_approvers(approver_id) where is_active;

insert into public.department_approvers (department_id, approver_id)
select p.department_id, p.id
from public.profiles p
where p.role = 'approver' and p.is_active and p.department_id is not null
on conflict (department_id, approver_id) do update set is_active = true, updated_at = now();

create or replace function public.sync_department_approver()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.department_approvers
  set is_active = false, updated_at = now()
  where approver_id = new.id;

  if new.role = 'approver' and new.is_active and new.department_id is not null then
    insert into public.department_approvers (department_id, approver_id, is_active)
    values (new.department_id, new.id, true)
    on conflict (department_id, approver_id)
    do update set is_active = true, updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists sync_department_approver on public.profiles;
create trigger sync_department_approver
after insert or update of role, department_id, is_active on public.profiles
for each row execute function public.sync_department_approver();

alter table public.bookings
  add column if not exists approval_deadline timestamptz,
  add column if not exists approval_digest_sent_at timestamptz,
  add column if not exists approved_after_deadline boolean not null default false;

alter table public.bookings drop constraint if exists bookings_approval_email_status_check;
alter table public.bookings add constraint bookings_approval_email_status_check
  check (approval_email_status in ('pending','queued','sent','failed','not_configured'));

create or replace function public.set_ot_approval_deadline()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.request_type = 'overtime' and new.approval_deadline is null then
    new.approval_deadline := ((now() at time zone 'Asia/Bangkok')::date + time '16:00') at time zone 'Asia/Bangkok';
  end if;
  return new;
end;
$$;

drop trigger if exists set_ot_approval_deadline on public.bookings;
create trigger set_ot_approval_deadline
before insert or update of request_type on public.bookings
for each row execute function public.set_ot_approval_deadline();

create or replace function public.ot_request_window_open()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (now() at time zone 'Asia/Bangkok')::time >= time '08:00'
     and (now() at time zone 'Asia/Bangkok')::time < time '16:00'
$$;

create or replace function public.assert_ot_request_window(p_request_type text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_request_type = 'overtime' and not public.ot_request_window_open() then
    raise exception 'OT requests can be submitted only from 08:00 to 16:00 (Asia/Bangkok).';
  end if;
end;
$$;

create or replace function public.enforce_ot_request_window()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if public.app_role() = 'requester'
     and new.request_type = 'overtime'
     and new.status = 'pending_approval'
     and (tg_op = 'INSERT' or old.status is distinct from 'pending_approval')
     and not public.ot_request_window_open() then
    raise exception 'OT requests can be submitted only from 08:00 to 16:00 (Asia/Bangkok).';
  end if;
  return new;
end;
$$;

create or replace function public.can_view_booking(p_booking_id uuid, p_requester_id uuid, p_department_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select
    p_requester_id = (select auth.uid())
    or public.app_role() = 'admin'
    or (
      public.app_role() = 'approver'
      and exists (
        select 1 from public.department_approvers da
        where da.department_id = p_department_id
          and da.approver_id = (select auth.uid())
          and da.is_active
      )
    )
    or (
      public.app_role() = 'driver' and exists (
        select 1 from public.vehicle_assignments va
        join public.drivers d on d.id = va.driver_id
        where va.booking_id = p_booking_id and d.user_id = (select auth.uid())
      )
    )
$$;

create or replace function public.decide_booking(p_booking_id uuid, p_action text, p_comments text default '')
returns void language plpgsql security definer set search_path = ''
as $$
declare target public.bookings;
begin
  select * into target from public.bookings where id = p_booking_id for update;
  if target.id is null or target.status <> 'pending_approval' then
    raise exception 'Booking is not awaiting approval.';
  end if;
  if public.app_role() <> 'approver' or not exists (
    select 1 from public.department_approvers da
    where da.department_id = target.department_id
      and da.approver_id = auth.uid()
      and da.is_active
  ) then
    raise exception 'You are not an active approver for this department.';
  end if;
  if p_action not in ('approved','rejected','changes_requested') then
    raise exception 'Invalid approval action.';
  end if;
  if p_action in ('rejected','changes_requested') and length(trim(coalesce(p_comments, ''))) = 0 then
    raise exception 'A comment is required.';
  end if;

  insert into public.approvals (booking_id, approver_id, action, comments)
  values (p_booking_id, auth.uid(), case when p_action = 'changes_requested' then 'rejected' else p_action end, coalesce(p_comments, ''));

  update public.bookings set
    status = p_action,
    approver_id = auth.uid(),
    approved_after_deadline = p_action = 'approved'
      and approval_deadline is not null
      and now() > approval_deadline,
    reject_reason = case when p_action in ('rejected','changes_requested') then p_comments else null end,
    updated_at = now()
  where id = p_booking_id;
end;
$$;

alter table public.department_approvers enable row level security;
drop policy if exists department_approvers_read on public.department_approvers;
create policy department_approvers_read on public.department_approvers
for select to authenticated using (true);
drop policy if exists department_approvers_admin_write on public.department_approvers;
create policy department_approvers_admin_write on public.department_approvers
for all to authenticated using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

grant select on public.department_approvers to authenticated;
grant insert, update, delete on public.department_approvers to authenticated;

commit;