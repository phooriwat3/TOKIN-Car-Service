begin;

create extension if not exists pgcrypto;

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.departments (name, code)
values ('Unassigned', 'UNASSIGNED')
on conflict (code) do nothing;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_id text unique not null,
  full_name text not null,
  email text unique not null,
  department_id uuid references public.departments(id),
  role text not null check (role in ('requester','approver','admin','driver')) default 'requester',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  default_department uuid;
begin
  select id into default_department from public.departments where code = 'UNASSIGNED';
  insert into public.profiles (id, employee_id, full_name, email, department_id, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'employee_id', ''), 'NEW-' || left(new.id::text, 8)),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    default_department,
    'requester'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create sequence public.booking_number_seq start 1;

create or replace function public.generate_booking_no()
returns text language sql volatile set search_path = ''
as $$
  select 'CSR-' || extract(year from current_date)::int || '-' ||
         lpad(nextval('public.booking_number_seq')::text, 6, '0')
$$;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  license_plate text unique not null,
  brand text not null,
  model text not null,
  vehicle_type text not null check (vehicle_type in ('van','car','pickup','other')),
  capacity integer not null check (capacity > 0),
  color text,
  year integer check (year between 1990 and 2200),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id),
  employee_id text unique,
  full_name text not null,
  phone text not null,
  license_number text unique not null,
  license_expiry date not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_no text unique not null default public.generate_booking_no(),
  requester_id uuid not null references public.profiles(id),
  department_id uuid not null references public.departments(id),
  status text not null default 'pending_approval'
    check (status in ('draft','pending_approval','approved','rejected','assigned','in_progress','completed','cancelled')),
  category text not null
    check (category in ('business_trip','after_hours','errand','overtime_transport','visitor_pickup')),
  using_date date not null,
  start_time time not null,
  end_time time not null,
  pickup_location text not null,
  destination text not null,
  purpose text not null,
  num_passengers integer not null check (num_passengers between 1 and 20),
  meeting_point text not null check (meeting_point in ('front_area','loading_area')),
  vehicle_type_pref text not null default 'any'
    check (vehicle_type_pref in ('van','car','pickup','other','any')),
  driver_required boolean not null default true,
  urgent boolean not null default false,
  urgent_reason text,
  after_hours boolean not null default false,
  overtime_transport boolean not null default false,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_booking_time check (end_time > start_time),
  constraint urgent_reason_required check (not urgent or length(trim(coalesce(urgent_reason, ''))) > 0)
);

create table public.booking_passengers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  name text not null,
  seq integer not null default 0
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  approver_id uuid not null references public.profiles(id),
  action text not null check (action in ('approved','rejected')),
  comments text not null default '',
  acted_at timestamptz not null default now()
);

create table public.vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references public.bookings(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id),
  driver_id uuid not null references public.drivers(id),
  assigned_by uuid not null references public.profiles(id),
  driver_accepted boolean not null default false,
  driver_accepted_at timestamptz,
  notes text,
  assigned_at timestamptz not null default now()
);

create table public.trip_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references public.bookings(id) on delete cascade,
  actual_time_out timestamptz,
  actual_time_in timestamptz,
  start_mileage numeric(10,1),
  end_mileage numeric(10,1),
  remarks text,
  recorded_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint valid_mileage check (end_mileage is null or start_mileage is null or end_mileage > start_mileage)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references public.bookings(id) on delete cascade,
  fuel_cost numeric(10,2) not null default 0 check (fuel_cost >= 0),
  toll_fee numeric(10,2) not null default 0 check (toll_fee >= 0),
  parking_fee numeric(10,2) not null default 0 check (parking_fee >= 0),
  updated_at timestamptz not null default now()
);

create index bookings_status_idx on public.bookings(status);
create index bookings_using_date_idx on public.bookings(using_date);
create index bookings_requester_idx on public.bookings(requester_id);
create index bookings_department_idx on public.bookings(department_id);
create index assignments_vehicle_idx on public.vehicle_assignments(vehicle_id);
create index assignments_driver_idx on public.vehicle_assignments(driver_id);

create or replace function public.app_role()
returns text language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) and is_active $$;

create or replace function public.app_department_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select department_id from public.profiles where id = (select auth.uid()) and is_active $$;

create or replace function public.can_view_booking(p_booking_id uuid, p_requester_id uuid, p_department_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select
    p_requester_id = (select auth.uid())
    or public.app_role() = 'admin'
    or (public.app_role() = 'approver' and p_department_id = public.app_department_id())
    or (
      public.app_role() = 'driver' and exists (
        select 1
        from public.vehicle_assignments va
        join public.drivers d on d.id = va.driver_id
        where va.booking_id = p_booking_id and d.user_id = (select auth.uid())
      )
    )
$$;

alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_passengers enable row level security;
alter table public.approvals enable row level security;
alter table public.vehicle_assignments enable row level security;
alter table public.trip_logs enable row level security;
alter table public.expenses enable row level security;

create policy departments_read on public.departments for select to authenticated using (true);
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy vehicles_read on public.vehicles for select to authenticated using (true);
create policy drivers_read on public.drivers for select to authenticated using (true);
create policy vehicles_admin_insert on public.vehicles for insert to authenticated with check (public.app_role() = 'admin');
create policy vehicles_admin_update on public.vehicles for update to authenticated using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy drivers_admin_insert on public.drivers for insert to authenticated with check (public.app_role() = 'admin');
create policy drivers_admin_update on public.drivers for update to authenticated using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

create policy bookings_read on public.bookings for select to authenticated
using (public.can_view_booking(id, requester_id, department_id));
create policy bookings_requester_insert on public.bookings for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and department_id = public.app_department_id()
  and public.app_role() = 'requester'
  and status = 'pending_approval'
);
create policy bookings_requester_update_draft on public.bookings for update to authenticated
using (requester_id = (select auth.uid()) and status = 'draft')
with check (requester_id = (select auth.uid()) and status in ('draft','pending_approval'));

create policy passengers_read on public.booking_passengers for select to authenticated
using (exists (
  select 1 from public.bookings b
  where b.id = booking_id and public.can_view_booking(b.id, b.requester_id, b.department_id)
));
create policy passengers_insert on public.booking_passengers for insert to authenticated
with check (exists (
  select 1 from public.bookings b
  where b.id = booking_id and b.requester_id = (select auth.uid())
));

create policy approvals_read on public.approvals for select to authenticated
using (exists (
  select 1 from public.bookings b
  where b.id = booking_id and public.can_view_booking(b.id, b.requester_id, b.department_id)
));
create policy assignments_read on public.vehicle_assignments for select to authenticated
using (exists (
  select 1 from public.bookings b
  where b.id = booking_id and public.can_view_booking(b.id, b.requester_id, b.department_id)
));
create policy trip_logs_read on public.trip_logs for select to authenticated
using (exists (
  select 1 from public.bookings b
  where b.id = booking_id and public.can_view_booking(b.id, b.requester_id, b.department_id)
));
create policy expenses_read on public.expenses for select to authenticated
using (exists (
  select 1 from public.bookings b
  where b.id = booking_id and public.can_view_booking(b.id, b.requester_id, b.department_id)
));

create or replace function public.decide_booking(p_booking_id uuid, p_action text, p_comments text default '')
returns void language plpgsql security definer set search_path = ''
as $$
declare target public.bookings;
begin
  select * into target from public.bookings where id = p_booking_id for update;
  if target.id is null or target.status <> 'pending_approval' then
    raise exception 'Booking is not awaiting approval.';
  end if;
  if public.app_role() <> 'approver' or target.department_id <> public.app_department_id() then
    raise exception 'You are not allowed to decide this booking.';
  end if;
  if p_action not in ('approved','rejected') then raise exception 'Invalid approval action.'; end if;
  if p_action = 'rejected' and length(trim(coalesce(p_comments, ''))) = 0 then
    raise exception 'A rejection reason is required.';
  end if;
  insert into public.approvals (booking_id, approver_id, action, comments)
  values (p_booking_id, auth.uid(), p_action, coalesce(p_comments, ''));
  update public.bookings
  set status = p_action, reject_reason = case when p_action = 'rejected' then p_comments else null end, updated_at = now()
  where id = p_booking_id;
end;
$$;

create or replace function public.assign_booking(
  p_booking_id uuid, p_vehicle_id uuid, p_driver_id uuid, p_notes text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare target public.bookings;
begin
  if public.app_role() <> 'admin' then raise exception 'Admin role required.'; end if;
  select * into target from public.bookings where id = p_booking_id for update;
  if target.id is null or target.status not in ('approved','assigned') then
    raise exception 'Only approved bookings can be assigned.';
  end if;
  if not exists (
    select 1 from public.vehicles
    where id = p_vehicle_id and is_active and capacity >= target.num_passengers
  ) then raise exception 'Vehicle is unavailable or too small.'; end if;
  if not exists (
    select 1 from public.drivers
    where id = p_driver_id and is_active and license_expiry >= target.using_date
  ) then raise exception 'Driver is unavailable or the license expires before the trip.'; end if;
  if exists (
    select 1 from public.vehicle_assignments va
    join public.bookings b on b.id = va.booking_id
    where va.booking_id <> p_booking_id
      and (va.vehicle_id = p_vehicle_id or va.driver_id = p_driver_id)
      and b.status not in ('cancelled','rejected','completed')
      and b.using_date = target.using_date
      and b.start_time < target.end_time and target.start_time < b.end_time
  ) then raise exception 'Vehicle or driver is already assigned to an overlapping trip.'; end if;
  insert into public.vehicle_assignments
    (booking_id, vehicle_id, driver_id, assigned_by, notes, driver_accepted, driver_accepted_at, assigned_at)
  values (p_booking_id, p_vehicle_id, p_driver_id, auth.uid(), p_notes, false, null, now())
  on conflict (booking_id) do update set
    vehicle_id = excluded.vehicle_id,
    driver_id = excluded.driver_id,
    assigned_by = excluded.assigned_by,
    notes = excluded.notes,
    driver_accepted = false,
    driver_accepted_at = null,
    assigned_at = now();
  update public.bookings set status = 'assigned', updated_at = now() where id = p_booking_id;
end;
$$;

create or replace function public.accept_assignment(p_booking_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if public.app_role() <> 'driver' or not exists (
    select 1 from public.vehicle_assignments va
    join public.drivers d on d.id = va.driver_id
    join public.bookings b on b.id = va.booking_id
    where va.booking_id = p_booking_id and d.user_id = auth.uid() and b.status = 'assigned'
  ) then raise exception 'This trip is not assigned to you.'; end if;
  update public.vehicle_assignments
  set driver_accepted = true, driver_accepted_at = now()
  where booking_id = p_booking_id;
end;
$$;

create or replace function public.start_trip(
  p_booking_id uuid, p_actual_time_out timestamptz, p_start_mileage numeric
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_start_mileage <= 0 then raise exception 'Starting mileage must be positive.'; end if;
  if public.app_role() <> 'driver' or not exists (
    select 1 from public.vehicle_assignments va
    join public.drivers d on d.id = va.driver_id
    join public.bookings b on b.id = va.booking_id
    where va.booking_id = p_booking_id and d.user_id = auth.uid()
      and va.driver_accepted and b.status = 'assigned'
  ) then raise exception 'This accepted trip is not assigned to you.'; end if;
  insert into public.trip_logs (booking_id, actual_time_out, start_mileage, recorded_by)
  values (p_booking_id, p_actual_time_out, p_start_mileage, auth.uid())
  on conflict (booking_id) do update set
    actual_time_out = excluded.actual_time_out,
    start_mileage = excluded.start_mileage,
    recorded_by = excluded.recorded_by,
    updated_at = now();
  update public.bookings set status = 'in_progress', updated_at = now() where id = p_booking_id;
end;
$$;

create or replace function public.complete_trip(
  p_booking_id uuid,
  p_actual_time_in timestamptz,
  p_end_mileage numeric,
  p_fuel_cost numeric default 0,
  p_toll_fee numeric default 0,
  p_parking_fee numeric default 0,
  p_remarks text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare start_value numeric;
begin
  if public.app_role() <> 'driver' or not exists (
    select 1 from public.vehicle_assignments va
    join public.drivers d on d.id = va.driver_id
    join public.bookings b on b.id = va.booking_id
    where va.booking_id = p_booking_id and d.user_id = auth.uid() and b.status = 'in_progress'
  ) then raise exception 'This active trip is not assigned to you.'; end if;
  select start_mileage into start_value from public.trip_logs where booking_id = p_booking_id for update;
  if p_end_mileage <= start_value then raise exception 'Ending mileage must exceed starting mileage.'; end if;
  if least(p_fuel_cost, p_toll_fee, p_parking_fee) < 0 then raise exception 'Expenses cannot be negative.'; end if;
  update public.trip_logs set
    actual_time_in = coalesce(p_actual_time_in, now()),
    end_mileage = p_end_mileage,
    remarks = p_remarks,
    updated_at = now()
  where booking_id = p_booking_id;
  insert into public.expenses (booking_id, fuel_cost, toll_fee, parking_fee)
  values (p_booking_id, p_fuel_cost, p_toll_fee, p_parking_fee)
  on conflict (booking_id) do update set
    fuel_cost = excluded.fuel_cost,
    toll_fee = excluded.toll_fee,
    parking_fee = excluded.parking_fee,
    updated_at = now();
  update public.bookings set status = 'completed', updated_at = now() where id = p_booking_id;
end;
$$;

revoke all on function public.decide_booking(uuid, text, text) from public;
revoke all on function public.assign_booking(uuid, uuid, uuid, text) from public;
revoke all on function public.accept_assignment(uuid) from public;
revoke all on function public.start_trip(uuid, timestamptz, numeric) from public;
revoke all on function public.complete_trip(uuid, timestamptz, numeric, numeric, numeric, numeric, text) from public;
grant execute on function public.decide_booking(uuid, text, text) to authenticated;
grant execute on function public.assign_booking(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.accept_assignment(uuid) to authenticated;
grant execute on function public.start_trip(uuid, timestamptz, numeric) to authenticated;
grant execute on function public.complete_trip(uuid, timestamptz, numeric, numeric, numeric, numeric, text) to authenticated;

grant usage on schema public to authenticated;
grant select on public.departments, public.vehicles, public.drivers,
  public.bookings, public.booking_passengers, public.approvals,
  public.vehicle_assignments, public.trip_logs, public.expenses to authenticated;
grant select (id, employee_id, full_name, department_id, role, is_active)
  on public.profiles to authenticated;
grant insert on public.bookings, public.booking_passengers, public.vehicles, public.drivers to authenticated;
grant update on public.bookings, public.vehicles, public.drivers to authenticated;
grant usage, select on sequence public.booking_number_seq to authenticated;

commit;
