begin;

-- Phase 1: replace the LINE-first workflow with email approval while keeping
-- the existing trip/vehicle tables compatible with historical records.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check (status in (
  'draft','pending_approval','changes_requested','approved','rejected',
  'assigned','scheduled','in_progress','completed','cancelled'
));

alter table public.bookings
  add column if not exists request_type text not null default 'outside_company'
    check (request_type in ('outside_company','overtime')),
  add column if not exists approver_id uuid references public.profiles(id),
  add column if not exists approver_name text,
  add column if not exists approver_email text,
  add column if not exists with_staff boolean not null default false;

create table if not exists public.overtime_employees (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  employee_id text not null,
  employee_name text not null,
  work_description text not null,
  work_start time not null,
  work_end time not null,
  total_weekly_hours numeric(5,2) not null check (total_weekly_hours between 0 and 60),
  transport_required boolean not null default true,
  bus_stop text,
  seq integer not null default 0,
  constraint overtime_time_valid check (work_end > work_start),
  constraint bus_stop_required check (not transport_required or length(trim(coalesce(bus_stop, ''))) > 0)
);

create index if not exists bookings_approver_idx on public.bookings(approver_id);
create index if not exists overtime_employees_booking_idx on public.overtime_employees(booking_id);

alter table public.overtime_employees enable row level security;

drop policy if exists bookings_requester_insert on public.bookings;
create policy bookings_requester_insert on public.bookings for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and department_id = public.app_department_id()
  and public.app_role() = 'requester'
  and status in ('draft','pending_approval')
);

drop policy if exists bookings_requester_update_draft on public.bookings;
create policy bookings_requester_update_draft on public.bookings for update to authenticated
using (requester_id = (select auth.uid()) and status in ('draft','changes_requested'))
with check (requester_id = (select auth.uid()) and status in ('draft','pending_approval'));

create policy overtime_employees_read on public.overtime_employees for select to authenticated
using (exists (
  select 1 from public.bookings b where b.id = booking_id
  and public.can_view_booking(b.id, b.requester_id, b.department_id)
));
create policy overtime_employees_insert on public.overtime_employees for insert to authenticated
with check (exists (
  select 1 from public.bookings b where b.id = booking_id and b.requester_id = (select auth.uid())
));

create or replace function public.can_view_booking(p_booking_id uuid, p_requester_id uuid, p_department_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select
    p_requester_id = (select auth.uid())
    or public.app_role() = 'admin'
    or (
      public.app_role() = 'approver'
      and exists (select 1 from public.bookings b where b.id = p_booking_id and b.approver_id = (select auth.uid()))
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
  if public.app_role() <> 'approver' or target.approver_id <> auth.uid() then
    raise exception 'You are not the selected approver for this booking.';
  end if;
  if p_action not in ('approved','rejected','changes_requested') then raise exception 'Invalid approval action.'; end if;
  if p_action in ('rejected','changes_requested') and length(trim(coalesce(p_comments, ''))) = 0 then
    raise exception 'A comment is required.';
  end if;
  insert into public.approvals (booking_id, approver_id, action, comments)
  values (p_booking_id, auth.uid(), case when p_action = 'changes_requested' then 'rejected' else p_action end, coalesce(p_comments, ''));
  update public.bookings set
    status = p_action,
    reject_reason = case when p_action in ('rejected','changes_requested') then p_comments else null end,
    updated_at = now()
  where id = p_booking_id;
end;
$$;

grant select (id, employee_id, full_name, email, department_id, role, is_active) on public.profiles to authenticated;
grant select, insert on public.overtime_employees to authenticated;

commit;
