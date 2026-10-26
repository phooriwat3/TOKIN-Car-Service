begin;

create or replace function public.complete_workflow_delivery(
  p_outbox_id uuid,
  p_worker_id uuid,
  p_attempt_no integer,
  p_success boolean,
  p_workflow_run_id text,
  p_http_status integer,
  p_sanitized_error text,
  p_permanent_failure boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.workflow_outbox;
  next_attempt_at timestamptz;
  final_status text;
begin
  select * into target
  from public.workflow_outbox
  where id = p_outbox_id
  for update;

  if target.id is null then raise exception 'Outbox item not found.'; end if;
  if target.status <> 'processing'
     or target.locked_by is distinct from p_worker_id
     or target.attempt_count <> p_attempt_no then
    raise exception 'The delivery lease is no longer valid.';
  end if;

  if p_success then
    final_status := 'delivered';
    next_attempt_at := null;
  elsif coalesce(p_permanent_failure, false)
        or target.attempt_count >= target.max_attempts then
    final_status := 'dead_letter';
    next_attempt_at := null;
  else
    final_status := 'failed';
    next_attempt_at := clock_timestamp()
      + make_interval(secs => least(21600, 30 * (2 ^ least(target.attempt_count, 9))::integer));
  end if;

  insert into public.workflow_deliveries (
    outbox_id, attempt_no, channel, status, workflow_run_id, http_status,
    sanitized_error, started_at, completed_at, next_retry_at
  ) values (
    target.id, target.attempt_count, 'power_automate',
    case when p_success then 'delivered' else 'failed' end,
    nullif(left(coalesce(p_workflow_run_id, ''), 240), ''), p_http_status,
    case when p_success then null else left(coalesce(p_sanitized_error, 'Delivery failed.'), 500) end,
    target.locked_at, clock_timestamp(), next_attempt_at
  );

  update public.workflow_outbox
  set status = final_status,
      available_at = coalesce(next_attempt_at, available_at),
      delivered_at = case when p_success then clock_timestamp() else delivered_at end,
      last_error = case when p_success then null else left(coalesce(p_sanitized_error, 'Delivery failed.'), 500) end,
      locked_at = null,
      locked_by = null,
      updated_at = clock_timestamp()
  where id = target.id;

  if target.booking_id is not null then
    update public.bookings
    set requester_manage_email_status = case
      when p_success then 'sent'
      when final_status = 'dead_letter' then 'failed'
      else requester_manage_email_status
    end
    where id = target.booking_id
      and target.event_type = 'request.changes_requested';
  end if;

  return jsonb_build_object(
    'outboxId', target.id,
    'status', final_status,
    'nextRetryAt', next_attempt_at
  );
end;
$$;

revoke all on function public.complete_workflow_delivery(
  uuid, uuid, integer, boolean, text, integer, text, boolean
) from public, anon, authenticated;
grant execute on function public.complete_workflow_delivery(
  uuid, uuid, integer, boolean, text, integer, text, boolean
) to service_role;

comment on function public.complete_workflow_delivery(
  uuid, uuid, integer, boolean, text, integer, text, boolean
) is 'Completes a leased outbox attempt and immediately dead-letters permanent destination 4xx failures.';

select pg_notify('pgrst', 'reload schema');

commit;
