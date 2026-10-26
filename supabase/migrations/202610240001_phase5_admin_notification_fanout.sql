begin;

create or replace function public.fan_out_phase5_admin_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_payload jsonb;
begin
  if new.event_type = 'request.approved'
     and jsonb_typeof(new.payload -> 'adminNotification') = 'object' then
    admin_payload := (new.payload -> 'adminNotification') || jsonb_build_object(
      'event', 'admin.request_ready',
      'requestId', new.booking_id,
      'requestNo', new.payload ->> 'requestNo',
      'status', 'ready_for_ga',
      'workflowVersion', new.payload -> 'workflowVersion',
      'correlationId', new.correlation_id
    );

    new.payload := new.payload - 'adminNotification';

    insert into public.workflow_outbox (
      booking_id,
      event_type,
      schema_version,
      deduplication_key,
      payload,
      correlation_id
    ) values (
      new.booking_id,
      'admin.request_ready',
      new.schema_version,
      new.deduplication_key || ':admin',
      admin_payload,
      new.correlation_id
    )
    on conflict (deduplication_key) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.fan_out_phase5_admin_notification() from public;

drop trigger if exists fan_out_phase5_admin_notification
  on public.workflow_outbox;
create trigger fan_out_phase5_admin_notification
before insert on public.workflow_outbox
for each row execute function public.fan_out_phase5_admin_notification();

comment on function public.fan_out_phase5_admin_notification() is
  'Atomically separates the privacy-minimized GA notification from an approved requester event.';

commit;
