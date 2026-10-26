-- GA owns cancellations after approval. The command preserves assignment
-- evidence, records a revision, notifies the requester/admin through the
-- durable outbox, and supports an audited manual LINE withdrawal to drivers.

begin;

alter table public.driver_dispatch_events
  drop constraint if exists driver_dispatch_events_action_check;
alter table public.driver_dispatch_events
  add constraint driver_dispatch_events_action_check
  check (action in (
    'copied', 'opened', 'sent',
    'cancellation_copied', 'cancellation_opened', 'cancellation_sent'
  ));

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
  cancellation_action boolean;
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
  if p_action not in (
    'copied', 'opened', 'sent',
    'cancellation_copied', 'cancellation_opened', 'cancellation_sent'
  ) then
    raise exception 'Unsupported driver dispatch action.';
  end if;

  cancellation_action := p_action like 'cancellation_%';
  if exists (
    select 1
    from unnest(normalized_ids) as requested(id)
    left join public.bookings booking on booking.id = requested.id
    where booking.id is null
       or (cancellation_action and booking.status <> 'cancelled')
       or (not cancellation_action and booking.status <> 'assigned')
  ) then
    raise exception 'Every booking must be in the correct state for this LINE action.';
  end if;

  insert into public.driver_dispatch_events (
    booking_id, transport_unit_id, action, actor_id, actor_email
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

create or replace function public.admin_cancel_booking(
  p_booking_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.bookings%rowtype;
  changed public.bookings%rowtype;
  normalized_reason text := left(trim(coalesce(p_reason, '')), 1000);
  correlation uuid := gen_random_uuid();
  next_revision integer;
  has_assignment boolean;
begin
  if public.app_role() <> 'admin' then
    raise exception 'Admin access required.';
  end if;
  if length(normalized_reason) < 5 then
    raise exception 'Cancellation reason must contain at least 5 characters.';
  end if;

  select * into target
  from public.bookings
  where id = p_booking_id
  for update;

  if target.id is null then raise exception 'Request not found.'; end if;
  if target.status not in (
    'pending_requester_confirmation', 'pending_approval',
    'pending_ot_verification', 'changes_requested',
    'approved', 'assigned', 'scheduled'
  ) then
    raise exception 'A request in status % cannot be cancelled by GA.', target.status;
  end if;

  has_assignment := exists (
    select 1 from public.vehicle_assignments va where va.booking_id = target.id
  );
  next_revision := target.revision_no + 1;

  update public.bookings
  set status = 'cancelled',
      reject_reason = normalized_reason,
      revision_no = next_revision,
      updated_at = clock_timestamp()
  where id = target.id
  returning * into changed;

  insert into public.booking_revision_history (
    booking_id, revision_no, status, snapshot, change_source,
    changed_by_email, change_reason
  ) values (
    target.id, next_revision, 'cancelled',
    to_jsonb(changed) || jsonb_build_object(
      'vehicle_assignments', coalesce((
        select jsonb_agg(to_jsonb(va) order by va.assigned_at)
        from public.vehicle_assignments va
        where va.booking_id = target.id
      ), '[]'::jsonb)
    ),
    'admin_update',
    left(coalesce(auth.jwt() ->> 'email', ''), 320),
    normalized_reason
  );

  insert into public.workflow_outbox (
    booking_id, event_type, deduplication_key, payload, correlation_id
  ) values (
    target.id,
    'request.cancelled',
    'ga-cancel:' || target.id::text || ':' || next_revision::text || ':requester',
    jsonb_build_object(
      'schemaVersion', 1,
      'event', 'request.cancelled',
      'audience', 'requester',
      'requestId', target.id,
      'requestNo', target.booking_no,
      'requestType', target.request_type,
      'requester', jsonb_build_object(
        'name', target.requester_name,
        'email', target.requester_email,
        'department', target.requester_department
      ),
      'recipient', jsonb_build_object(
        'name', target.requester_name,
        'email', target.requester_email
      ),
      'usingDate', target.using_date,
      'startTime', target.start_time,
      'endTime', target.end_time,
      'pickupLocation', target.pickup_location,
      'destination', target.destination,
      'reason', normalized_reason,
      'teamsNotification', jsonb_build_object(
        'event', 'request_cancelled',
        'audience', 'requester',
        'title', 'Transport request cancelled',
        'message', target.booking_no || ' - ' || normalized_reason
      ),
      'emailSubject', '[Cancelled] ' || target.booking_no
    ),
    correlation
  );

  if has_assignment then
    insert into public.workflow_outbox (
      booking_id, event_type, deduplication_key, payload, correlation_id
    ) values (
      target.id,
      'admin.driver_cancellation_required',
      'ga-cancel:' || target.id::text || ':' || next_revision::text || ':driver',
      jsonb_build_object(
        'schemaVersion', 1,
        'event', 'admin.driver_cancellation_required',
        'audience', 'admin',
        'priority', 'high',
        'requestId', target.id,
        'requestNo', target.booking_no,
        'usingDate', target.using_date,
        'startTime', target.start_time,
        'destination', target.destination,
        'reason', normalized_reason,
        'driverLineRequired', true,
        'teamsNotification', jsonb_build_object(
          'event', 'driver_cancellation_required',
          'audience', 'admin',
          'priority', 'high',
          'title', 'Driver cancellation required',
          'message', target.booking_no || ' - send the LINE withdrawal and record it.'
        )
      ),
      correlation
    );
  end if;

  return jsonb_build_object(
    'requestId', target.id,
    'requestNo', target.booking_no,
    'status', 'cancelled',
    'revisionNo', next_revision,
    'workflowVersion', changed.workflow_version,
    'driverCancellationRequired', has_assignment,
    'correlationId', correlation
  );
end;
$$;

revoke all on function public.admin_cancel_booking(uuid, text)
  from public, anon;
grant execute on function public.admin_cancel_booking(uuid, text)
  to authenticated;

comment on function public.admin_cancel_booking(uuid, text) is
  'Cancels a pre-trip request under the GA admin role and atomically records requester/admin notification work.';
comment on column public.driver_dispatch_events.action is
  'Audited GA preparation/sent attestations for normal dispatch and cancellation withdrawal messages in LINE.';

select pg_notify('pgrst', 'reload schema');

commit;
