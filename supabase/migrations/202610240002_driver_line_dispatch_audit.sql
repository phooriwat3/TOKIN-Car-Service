begin;

create table if not exists public.driver_dispatch_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  transport_unit_id text,
  channel text not null default 'line_manual'
    check (channel = 'line_manual'),
  action text not null
    check (action in ('copied', 'opened')),
  actor_id uuid,
  actor_email text,
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists driver_dispatch_events_booking_idx
  on public.driver_dispatch_events (booking_id, created_at desc);

alter table public.driver_dispatch_events enable row level security;

drop policy if exists driver_dispatch_events_admin_read
  on public.driver_dispatch_events;
create policy driver_dispatch_events_admin_read
  on public.driver_dispatch_events
  for select
  to authenticated
  using (public.app_role() = 'admin');

revoke all on table public.driver_dispatch_events
  from public, anon, authenticated;
grant select on table public.driver_dispatch_events to authenticated;
grant select, insert on table public.driver_dispatch_events to service_role;

create or replace function public.record_driver_dispatch_event(
  p_booking_ids uuid[],
  p_transport_unit_id text,
  p_action text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_ids uuid[];
  inserted_count integer;
begin
  if public.app_role() <> 'admin' then
    raise exception 'Admin access required.';
  end if;

  select array_agg(distinct booking_id)
  into normalized_ids
  from unnest(coalesce(p_booking_ids, array[]::uuid[])) as booking_id;

  if coalesce(cardinality(normalized_ids), 0) = 0
     or cardinality(normalized_ids) > 50 then
    raise exception 'Provide between 1 and 50 booking IDs.';
  end if;
  if p_action not in ('copied', 'opened') then
    raise exception 'Unsupported driver dispatch action.';
  end if;
  if exists (
    select 1
    from unnest(normalized_ids) as requested(id)
    left join public.bookings booking on booking.id = requested.id
    where booking.id is null or booking.status <> 'assigned'
  ) then
    raise exception 'Every booking must exist and be assigned before LINE dispatch.';
  end if;

  insert into public.driver_dispatch_events (
    booking_id,
    transport_unit_id,
    action,
    actor_id,
    actor_email
  )
  select
    booking_id,
    nullif(left(trim(coalesce(p_transport_unit_id, '')), 160), ''),
    p_action,
    auth.uid(),
    left(coalesce(auth.jwt() ->> 'email', ''), 320)
  from unnest(normalized_ids) as booking_id;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.record_driver_dispatch_event(uuid[], text, text)
  from public, anon;
grant execute on function public.record_driver_dispatch_event(uuid[], text, text)
  to authenticated, service_role;

comment on table public.driver_dispatch_events is
  'Audit metadata for GA-prepared manual LINE driver dispatches. Message bodies and passenger data are intentionally not stored.';

select pg_notify('pgrst', 'reload schema');

commit;
