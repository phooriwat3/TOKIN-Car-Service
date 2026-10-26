begin;

alter table public.driver_dispatch_events
  drop constraint if exists driver_dispatch_events_action_check;
alter table public.driver_dispatch_events
  add constraint driver_dispatch_events_action_check
  check (action in ('copied', 'opened', 'sent'));

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
  if p_action not in ('copied', 'opened', 'sent') then
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

comment on column public.driver_dispatch_events.action is
  'GA action: copied/opened are preparation steps; sent is an explicit human attestation after pressing Send in LINE.';

select pg_notify('pgrst', 'reload schema');

commit;
