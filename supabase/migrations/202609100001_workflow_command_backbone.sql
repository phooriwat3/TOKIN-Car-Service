-- Phase 3: transactional workflow commands, idempotent actions, and durable delivery.
begin;

alter table public.bookings
  add column if not exists workflow_version integer not null default 1
    check (workflow_version > 0);

create or replace function public.advance_booking_workflow_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.workflow_version := old.workflow_version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists advance_booking_workflow_version on public.bookings;
create trigger advance_booking_workflow_version
before update of status on public.bookings
for each row execute function public.advance_booking_workflow_version();

revoke all on function public.advance_booking_workflow_version() from public;

create table public.workflow_actor_mappings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  teams_user_id text unique,
  directory_email text not null,
  is_active boolean not null default true,
  verified_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (length(trim(directory_email)) between 3 and 240),
  check (teams_user_id is null or length(trim(teams_user_id)) between 1 and 240)
);

create table public.workflow_actions (
  id uuid primary key default gen_random_uuid(),
  action_key text not null unique,
  request_hash text not null,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  command_type text not null check (command_type in ('approve','reject','request_changes')),
  source text not null check (source in ('teams','signed_link')),
  expected_version integer not null check (expected_version > 0),
  actor_email text not null,
  actor_teams_id text,
  assigned_approver_email text not null,
  state text not null default 'processing'
    check (state in ('processing','succeeded','rejected','failed')),
  previous_status text,
  resulting_status text,
  response_payload jsonb,
  correlation_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  check (length(action_key) between 8 and 200),
  check (request_hash ~ '^[0-9a-f]{64}$'),
  check (length(trim(actor_email)) between 3 and 240),
  check (length(trim(assigned_approver_email)) between 3 and 240)
);

create table public.workflow_outbox (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  event_type text not null,
  schema_version integer not null default 1 check (schema_version = 1),
  deduplication_key text not null unique,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending','processing','delivered','failed','dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 8 check (max_attempts between 1 and 1000),
  available_at timestamptz not null default clock_timestamp(),
  locked_at timestamptz,
  locked_by uuid,
  delivered_at timestamptz,
  last_error text,
  correlation_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (length(event_type) between 3 and 100),
  check (length(deduplication_key) between 8 and 240),
  check (jsonb_typeof(payload) = 'object'),
  check (last_error is null or length(last_error) <= 500)
);

create table public.workflow_deliveries (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.workflow_outbox(id) on delete cascade,
  attempt_no integer not null check (attempt_no > 0),
  channel text not null check (channel in ('power_automate')),
  status text not null check (status in ('delivered','failed')),
  workflow_run_id text,
  http_status integer check (http_status is null or http_status between 100 and 599),
  sanitized_error text,
  started_at timestamptz not null,
  completed_at timestamptz not null default clock_timestamp(),
  next_retry_at timestamptz,
  unique (outbox_id, attempt_no, channel),
  check (sanitized_error is null or length(sanitized_error) <= 500)
);

create index workflow_actions_booking_idx
  on public.workflow_actions (booking_id, created_at desc);
create index workflow_outbox_ready_idx
  on public.workflow_outbox (available_at, created_at)
  where status in ('pending','failed','processing');
create index workflow_outbox_booking_idx
  on public.workflow_outbox (booking_id, created_at desc);
create index workflow_deliveries_outbox_idx
  on public.workflow_deliveries (outbox_id, attempt_no desc);

alter table public.workflow_actor_mappings enable row level security;
alter table public.workflow_actions enable row level security;
alter table public.workflow_outbox enable row level security;
alter table public.workflow_deliveries enable row level security;

revoke all on public.workflow_actor_mappings from public, anon, authenticated;
revoke all on public.workflow_actions from public, anon, authenticated;
revoke all on public.workflow_outbox from public, anon, authenticated;
revoke all on public.workflow_deliveries from public, anon, authenticated;

grant select, insert, update, delete on public.workflow_actor_mappings to service_role;
grant select, insert, update on public.workflow_actions to service_role;
grant select, insert, update on public.workflow_outbox to service_role;
grant select, insert on public.workflow_deliveries to service_role;

create or replace function public.execute_approval_command(
  p_action_key text,
  p_request_hash text,
  p_booking_id uuid,
  p_action text,
  p_expected_version integer,
  p_actor_email text,
  p_actor_teams_id text,
  p_actor_name text,
  p_comments text,
  p_source text,
  p_correlation_id uuid,
  p_expires_at timestamptz,
  p_access_token_hash text default null,
  p_manage_token_hash text default null,
  p_manage_token_expires_at timestamptz default null,
  p_notification_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.bookings;
  access_token public.request_access_tokens;
  prior_action public.workflow_actions;
  actor_profile public.profiles;
  normalized_actor_email text := lower(trim(coalesce(p_actor_email, '')));
  normalized_assigned_email text;
  v_resulting_status text;
  command_name text;
  action_id uuid;
  response_body jsonb;
begin
  if length(trim(coalesce(p_action_key, ''))) not between 8 and 200 then
    raise exception 'Action key is invalid.';
  end if;
  if coalesce(p_request_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Request hash is invalid.';
  end if;
  if p_action not in ('approved','rejected','changes_requested') then
    raise exception 'Approval action is invalid.';
  end if;
  if p_source not in ('teams','signed_link') then
    raise exception 'Approval source is invalid.';
  end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'Expected workflow version is invalid.';
  end if;
  if normalized_actor_email = '' then
    raise exception 'The responder identity is required.';
  end if;
  if p_action <> 'approved' and length(trim(coalesce(p_comments, ''))) = 0 then
    raise exception 'Comments are required for this action.';
  end if;
  if p_notification_payload->>'schemaVersion' is distinct from '1' then
    raise exception 'Notification payload version is invalid.';
  end if;

  select * into target
  from public.bookings
  where id = p_booking_id
  for update;

  if target.id is null then
    raise exception 'Request not found.';
  end if;

  select * into prior_action
  from public.workflow_actions
  where action_key = trim(p_action_key)
  for update;

  if prior_action.id is not null then
    if prior_action.request_hash <> p_request_hash then
      raise exception 'The action key was already used for a different request.';
    end if;
    if prior_action.state = 'succeeded' then
      return coalesce(prior_action.response_payload, '{}'::jsonb)
        || jsonb_build_object('alreadyProcessed', true);
    end if;
    raise exception 'The approval action is already being processed.';
  end if;

  if p_expires_at is null or p_expires_at <= clock_timestamp() then
    raise exception 'The approval action has expired.';
  end if;

  if target.status <> 'pending_approval' then
    return jsonb_build_object(
      'outcome', 'already_processed',
      'alreadyProcessed', true,
      'bookingId', target.id,
      'requestNo', target.booking_no,
      'status', target.status,
      'workflowVersion', target.workflow_version
    );
  end if;
  if target.workflow_version <> p_expected_version then
    raise exception 'The request changed after this action was created.';
  end if;

  if p_source = 'signed_link' then
    if coalesce(p_access_token_hash, '') !~ '^[0-9a-f]{64}$' then
      raise exception 'The approval link is invalid.';
    end if;
    select * into access_token
    from public.request_access_tokens
    where token_hash = p_access_token_hash and token_type = 'approval'
    for update;
    if access_token.id is null
       or access_token.booking_id <> target.id
       or access_token.revision_no <> target.revision_no
       or access_token.used_at is not null
       or access_token.revoked_at is not null
       or access_token.expires_at <= clock_timestamp()
       or lower(trim(access_token.subject_email)) <> normalized_actor_email then
      raise exception 'The approval link is invalid, expired, or already used.';
    end if;
  end if;

  select * into actor_profile
  from public.profiles p
  where lower(trim(p.email)) = normalized_actor_email
    and p.role = 'approver'
    and p.is_active
  limit 1;

  if actor_profile.id is null then
    raise exception 'The responder is not an active approver.';
  end if;

  if target.request_type = 'outside_company' then
    normalized_assigned_email := lower(trim(coalesce(target.approver_email, '')));
    if normalized_actor_email <> normalized_assigned_email
       or (target.approver_id is not null and actor_profile.id <> target.approver_id) then
      raise exception 'The responder is not the assigned approver.';
    end if;
  else
    if not exists (
      select 1 from public.department_approvers da
      where da.department_id = target.department_id
        and da.approver_id = actor_profile.id
        and da.is_active
    ) then
      raise exception 'The responder is not an active approver for this department.';
    end if;
    normalized_assigned_email := normalized_actor_email;
  end if;

  if p_source = 'teams' and exists (
    select 1 from public.workflow_actor_mappings wam
    where wam.profile_id = actor_profile.id and wam.is_active
  ) and (
    p_actor_teams_id is null or not exists (
    select 1 from public.workflow_actor_mappings wam
    where wam.profile_id = actor_profile.id
      and wam.is_active
      and wam.teams_user_id = trim(p_actor_teams_id)
      and lower(trim(wam.directory_email)) = normalized_actor_email
    )
  ) then
    raise exception 'The Teams responder identity does not match the approver directory.';
  end if;

  if p_action = 'changes_requested' then
    if coalesce(p_manage_token_hash, '') !~ '^[0-9a-f]{64}$'
       or p_manage_token_expires_at is null
       or p_manage_token_expires_at <= clock_timestamp() then
      raise exception 'Requester management link details are required.';
    end if;
  end if;

  command_name := case p_action
    when 'approved' then 'approve'
    when 'rejected' then 'reject'
    else 'request_changes'
  end;

  insert into public.workflow_actions (
    action_key, request_hash, booking_id, command_type, source,
    expected_version, actor_email, actor_teams_id, assigned_approver_email,
    correlation_id, expires_at
  ) values (
    trim(p_action_key), p_request_hash, target.id, command_name, p_source,
    p_expected_version, normalized_actor_email,
    nullif(trim(coalesce(p_actor_teams_id, '')), ''), normalized_assigned_email,
    p_correlation_id, p_expires_at
  ) returning id into action_id;

  if p_source = 'signed_link' then
    update public.request_access_tokens
    set used_at = clock_timestamp(), last_accessed_at = clock_timestamp()
    where id = access_token.id;
  end if;

  insert into public.approvals (
    booking_id, approver_id, approver_name, approver_email, action, comments
  ) values (
    target.id, actor_profile.id,
    coalesce(nullif(trim(coalesce(p_actor_name, '')), ''), actor_profile.full_name),
    normalized_actor_email, p_action, coalesce(p_comments, '')
  );

  v_resulting_status := p_action;
  update public.bookings
  set status = v_resulting_status,
      approver_id = actor_profile.id,
      approver_name = actor_profile.full_name,
      approver_email = normalized_actor_email,
      approved_after_deadline = v_resulting_status = 'approved'
        and approval_deadline is not null
        and clock_timestamp() > approval_deadline,
      reject_reason = case
        when v_resulting_status in ('rejected','changes_requested') then trim(p_comments)
        else null
      end,
      workflow_version = workflow_version + 1,
      requester_manage_email_status = case
        when v_resulting_status = 'changes_requested' then 'pending'
        else requester_manage_email_status
      end,
      updated_at = clock_timestamp()
  where id = target.id;

  if v_resulting_status = 'changes_requested' then
    update public.request_access_tokens
    set revoked_at = coalesce(revoked_at, clock_timestamp())
    where booking_id = target.id
      and token_type = 'requester_manage'
      and used_at is null
      and revoked_at is null;

    insert into public.request_access_tokens (
      booking_id, token_type, token_hash, revision_no, subject_email, expires_at
    ) values (
      target.id, 'requester_manage', p_manage_token_hash, target.revision_no,
      target.requester_email, p_manage_token_expires_at
    );
  end if;

  insert into public.workflow_outbox (
    booking_id, event_type, deduplication_key, payload, correlation_id
  ) values (
    target.id,
    case v_resulting_status
      when 'approved' then 'request.approved'
      when 'rejected' then 'request.rejected'
      else 'request.changes_requested'
    end,
    'approval:' || action_id::text,
    p_notification_payload || jsonb_build_object(
      'event', case v_resulting_status
        when 'approved' then 'request.approved'
        when 'rejected' then 'request.rejected'
        else 'request.changes_requested'
      end,
      'requestId', target.id,
      'requestNo', target.booking_no,
      'status', v_resulting_status,
      'workflowVersion', target.workflow_version + 1,
      'correlationId', p_correlation_id
    ),
    p_correlation_id
  );

  response_body := jsonb_build_object(
    'outcome', 'processed',
    'alreadyProcessed', false,
    'bookingId', target.id,
    'requestNo', target.booking_no,
    'status', v_resulting_status,
    'workflowVersion', target.workflow_version + 1,
    'correlationId', p_correlation_id
  );

  update public.workflow_actions
  set state = 'succeeded',
      previous_status = target.status,
      resulting_status = v_resulting_status,
      response_payload = response_body,
      completed_at = clock_timestamp()
  where id = action_id;

  return response_body;
end;
$$;

create or replace function public.claim_workflow_outbox(
  p_worker_id uuid,
  p_limit integer default 20,
  p_lease_seconds integer default 60
)
returns table (
  id uuid,
  booking_id uuid,
  event_type text,
  schema_version integer,
  payload jsonb,
  attempt_no integer,
  correlation_id uuid,
  started_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  with abandoned as (
    update public.workflow_outbox wo
    set status = 'dead_letter',
        locked_at = null,
        locked_by = null,
        last_error = 'Delivery lease expired after the final attempt.',
        updated_at = clock_timestamp()
    where wo.status = 'processing'
      and wo.attempt_count >= wo.max_attempts
      and wo.locked_at < clock_timestamp() - make_interval(secs => greatest(10, p_lease_seconds))
    returning wo.id
  ), candidates as (
    select wo.id
    from public.workflow_outbox wo
    where wo.attempt_count < wo.max_attempts
      and (
        (wo.status in ('pending','failed') and wo.available_at <= clock_timestamp())
        or (
          wo.status = 'processing'
          and wo.locked_at < clock_timestamp() - make_interval(secs => greatest(10, p_lease_seconds))
        )
      )
      and not exists (select 1 from abandoned a where a.id = wo.id)
    order by wo.available_at, wo.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
  ), claimed as (
    update public.workflow_outbox wo
    set status = 'processing',
        attempt_count = wo.attempt_count + 1,
        locked_at = clock_timestamp(),
        locked_by = p_worker_id,
        updated_at = clock_timestamp()
    from candidates c
    where wo.id = c.id
    returning wo.*
  )
  select c.id, c.booking_id, c.event_type, c.schema_version, c.payload,
         c.attempt_count, c.correlation_id, c.locked_at
  from claimed c;
$$;

create or replace function public.complete_workflow_delivery(
  p_outbox_id uuid,
  p_worker_id uuid,
  p_attempt_no integer,
  p_success boolean,
  p_workflow_run_id text default null,
  p_http_status integer default null,
  p_sanitized_error text default null
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
  elsif target.attempt_count >= target.max_attempts then
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

create or replace function public.admin_workflow_delivery_overview(p_limit integer default 100)
returns table (
  outbox_id uuid,
  request_id uuid,
  event_type text,
  status text,
  attempt_count integer,
  available_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  correlation_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.app_role() <> 'admin' then
    raise exception 'Admin access required.';
  end if;
  return query
    select wo.id, wo.booking_id, wo.event_type, wo.status, wo.attempt_count,
           wo.available_at, wo.delivered_at, wo.last_error,
           wo.correlation_id, wo.created_at
    from public.workflow_outbox wo
    order by wo.created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

create or replace function public.admin_retry_workflow_delivery(p_outbox_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if public.app_role() <> 'admin' then
    raise exception 'Admin access required.';
  end if;

  update public.workflow_outbox
  set status = 'pending',
      max_attempts = least(1000, greatest(max_attempts, attempt_count + 8)),
      available_at = clock_timestamp(),
      locked_at = null,
      locked_by = null,
      last_error = null,
      updated_at = clock_timestamp()
  where id = p_outbox_id
    and status in ('failed','dead_letter')
    and attempt_count < 1000;

  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'Failed workflow delivery not found.';
  end if;

  return jsonb_build_object('outboxId', p_outbox_id, 'status', 'pending');
end;
$$;

revoke all on function public.execute_approval_command(
  text, text, uuid, text, integer, text, text, text, text, text, uuid,
  timestamptz, text, text, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.execute_approval_command(
  text, text, uuid, text, integer, text, text, text, text, text, uuid,
  timestamptz, text, text, timestamptz, jsonb
) to service_role;

revoke all on function public.claim_workflow_outbox(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_workflow_outbox(uuid, integer, integer)
  to service_role;

revoke all on function public.complete_workflow_delivery(
  uuid, uuid, integer, boolean, text, integer, text
) from public, anon, authenticated;
grant execute on function public.complete_workflow_delivery(
  uuid, uuid, integer, boolean, text, integer, text
) to service_role;

revoke all on function public.admin_workflow_delivery_overview(integer)
  from public, anon;
grant execute on function public.admin_workflow_delivery_overview(integer)
  to authenticated;

revoke all on function public.admin_retry_workflow_delivery(uuid)
  from public, anon;
grant execute on function public.admin_retry_workflow_delivery(uuid)
  to authenticated;

-- Prevent new callers from bypassing identity, version, and idempotency checks.
revoke execute on function public.process_approval_callback(uuid, text, text, text, text)
  from service_role;

comment on table public.workflow_actions is
  'Immutable idempotency and actor evidence for workflow commands.';
comment on table public.workflow_outbox is
  'Transactional, service-only workflow messages; payloads may contain expiring links.';
comment on function public.execute_approval_command(
  text, text, uuid, text, integer, text, text, text, text, text, uuid,
  timestamptz, text, text, timestamptz, jsonb
) is 'Atomically authorizes, records, and publishes one approval command.';

commit;
