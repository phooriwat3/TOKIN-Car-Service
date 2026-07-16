begin;

create table if not exists public.assignment_drafts (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id),
  driver_id uuid not null references public.drivers(id),
  notes text,
  planned_by uuid not null references public.profiles(id),
  planned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assignment_drafts enable row level security;
create policy assignment_drafts_admin_read on public.assignment_drafts
  for select to authenticated using (public.app_role() = 'admin');
grant select on public.assignment_drafts to authenticated;

create or replace function public.save_assignment_draft(
  p_booking_id uuid, p_vehicle_id uuid, p_driver_id uuid, p_notes text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare target public.bookings;
begin
  if public.app_role() <> 'admin' then raise exception 'Admin role required.'; end if;
  select * into target from public.bookings where id = p_booking_id;
  if target.id is null or target.status not in ('pending_approval','approved','changes_requested') then
    raise exception 'This request is not available for planning.';
  end if;
  if not exists (select 1 from public.vehicles where id = p_vehicle_id and is_active) then
    raise exception 'Selected vehicle is unavailable.';
  end if;
  if not exists (select 1 from public.drivers where id = p_driver_id and is_active) then
    raise exception 'Selected driver is unavailable.';
  end if;
  insert into public.assignment_drafts (booking_id,vehicle_id,driver_id,notes,planned_by,planned_at,updated_at)
  values (p_booking_id,p_vehicle_id,p_driver_id,p_notes,auth.uid(),now(),now())
  on conflict (booking_id) do update set
    vehicle_id=excluded.vehicle_id, driver_id=excluded.driver_id, notes=excluded.notes,
    planned_by=excluded.planned_by, updated_at=now();
end;
$$;

revoke all on function public.save_assignment_draft(uuid,uuid,uuid,text) from public;
grant execute on function public.save_assignment_draft(uuid,uuid,uuid,text) to authenticated;

-- When the real assignment is confirmed, its draft is no longer needed.
create or replace function public.clear_assignment_draft_after_assign()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin delete from public.assignment_drafts where booking_id = new.booking_id; return new; end $$;
drop trigger if exists clear_assignment_draft_after_assign on public.vehicle_assignments;
create trigger clear_assignment_draft_after_assign after insert or update on public.vehicle_assignments
for each row execute function public.clear_assignment_draft_after_assign();

commit;
