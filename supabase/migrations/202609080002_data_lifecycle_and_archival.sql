-- Phase 1 data lifecycle baseline.
-- Archive a complete booking aggregate before cascade-deleting hot records.

begin;

create table public.archived_bookings (
  id uuid primary key,
  booking_no text not null,
  requester_id uuid,
  requester_name text not null,
  requester_email text,
  requester_employee_id text,
  department text not null,
  status text not null,
  category text not null,
  request_type text not null,
  using_date date not null,
  start_time time not null,
  end_time time not null,
  pickup_location text not null,
  destination text not null,
  purpose text,
  num_passengers integer not null default 1,
  booking_snapshot jsonb not null,
  passenger_list jsonb not null default '[]'::jsonb,
  overtime_employees jsonb not null default '[]'::jsonb,
  approvals jsonb not null default '[]'::jsonb,
  assignment jsonb,
  trip_log jsonb,
  expense jsonb,
  revision_history jsonb not null default '[]'::jsonb,
  is_pii_anonymized boolean not null default false,
  archived_at timestamptz not null default now(),
  created_at timestamptz not null
);

create index idx_archived_bookings_using_date
  on public.archived_bookings (using_date);
create index idx_archived_bookings_department
  on public.archived_bookings (department);
create index idx_archived_bookings_status_date
  on public.archived_bookings (status, using_date);

alter table public.archived_bookings enable row level security;
create policy archived_bookings_authorized_read
  on public.archived_bookings
  for select
  to authenticated
  using (public.app_role() in ('admin', 'finance', 'executive', 'auditor'));

revoke all on public.archived_bookings from public, anon, authenticated;
grant select on public.archived_bookings to authenticated;
grant select, insert, update, delete on public.archived_bookings to service_role;

create or replace function public.archive_cold_bookings(retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  archived_count integer := 0;
begin
  if retention_days < 30 or retention_days > 3650 then
    raise exception 'Retention days must be between 30 and 3650.';
  end if;

  insert into public.archived_bookings (
    id, booking_no, requester_id, requester_name, requester_email,
    requester_employee_id, department, status, category, request_type,
    using_date, start_time, end_time, pickup_location, destination, purpose,
    num_passengers, booking_snapshot, passenger_list, overtime_employees,
    approvals, assignment, trip_log, expense, revision_history, created_at
  )
  select
    b.id,
    b.booking_no,
    b.requester_id,
    b.requester_name,
    b.requester_email,
    b.requester_employee_id,
    b.requester_department,
    b.status,
    b.category,
    b.request_type,
    b.using_date,
    b.start_time,
    b.end_time,
    b.pickup_location,
    b.destination,
    b.purpose,
    b.num_passengers,
    to_jsonb(b),
    coalesce((
      select jsonb_agg(to_jsonb(bp) order by bp.seq, bp.id)
      from public.booking_passengers bp
      where bp.booking_id = b.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(to_jsonb(oe) order by oe.seq, oe.id)
      from public.overtime_employees oe
      where oe.booking_id = b.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(to_jsonb(a) order by a.acted_at, a.id)
      from public.approvals a
      where a.booking_id = b.id
    ), '[]'::jsonb),
    (
      select to_jsonb(va) || jsonb_build_object(
        'vehicle', to_jsonb(v),
        'driver', to_jsonb(d),
        'assigned_by_profile', to_jsonb(ap)
      )
      from public.vehicle_assignments va
      left join public.vehicles v on v.id = va.vehicle_id
      left join public.drivers d on d.id = va.driver_id
      left join public.profiles ap on ap.id = va.assigned_by
      where va.booking_id = b.id
    ),
    (
      select to_jsonb(tl)
      from public.trip_logs tl
      where tl.booking_id = b.id
    ),
    (
      select to_jsonb(e)
      from public.expenses e
      where e.booking_id = b.id
    ),
    coalesce((
      select jsonb_agg(to_jsonb(brh) order by brh.revision_no, brh.created_at)
      from public.booking_revision_history brh
      where brh.booking_id = b.id
    ), '[]'::jsonb),
    b.created_at
  from public.bookings b
  where b.status in ('completed', 'cancelled', 'rejected')
    and b.using_date < current_date - retention_days
  on conflict (id) do nothing;

  get diagnostics archived_count = row_count;

  -- Delete only records that have a durable archive copy. Related rows are
  -- intentionally captured above before their ON DELETE CASCADE runs.
  delete from public.bookings b
  where b.status in ('completed', 'cancelled', 'rejected')
    and b.using_date < current_date - retention_days
    and exists (
      select 1 from public.archived_bookings ab where ab.id = b.id
    );

  return archived_count;
end;
$$;

create or replace function public.anonymize_stale_pii(anonymize_after_days integer default 365)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  scrubbed_count integer := 0;
begin
  if anonymize_after_days < 90 or anonymize_after_days > 3650 then
    raise exception 'Anonymization days must be between 90 and 3650.';
  end if;

  update public.archived_bookings
  set
    requester_id = null,
    requester_name = '[PDPA_SCRUBBED]',
    requester_email = null,
    requester_employee_id = null,
    booking_snapshot = booking_snapshot
      - 'requester_id'
      - 'requester_name'
      - 'requester_email'
      - 'requester_employee_id'
      - 'approver_id'
      - 'approver_name'
      - 'approver_email'
      - 'created_by'
      - 'created_by_name',
    passenger_list = '[]'::jsonb,
    overtime_employees = '[]'::jsonb,
    approvals = '[]'::jsonb,
    assignment = null,
    trip_log = case
      when trip_log is null then null
      else trip_log - 'recorded_by'
    end,
    revision_history = '[]'::jsonb,
    is_pii_anonymized = true
  where using_date < current_date - anonymize_after_days
    and not is_pii_anonymized;

  get diagnostics scrubbed_count = row_count;
  return scrubbed_count;
end;
$$;

revoke all on function public.archive_cold_bookings(integer) from public, anon, authenticated;
revoke all on function public.anonymize_stale_pii(integer) from public, anon, authenticated;
grant execute on function public.archive_cold_bookings(integer) to service_role;
grant execute on function public.anonymize_stale_pii(integer) to service_role;

commit;
