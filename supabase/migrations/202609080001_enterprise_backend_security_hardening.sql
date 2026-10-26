-- Phase 1 enterprise security baseline.
-- Performance, durable throttling, role consistency, and least privilege.

begin;

-- Keep the database role model aligned with the application role model.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (
  role in ('requester', 'approver', 'admin', 'driver', 'finance', 'executive', 'auditor')
);

-- High-traffic indexes for request queues and shift-end grouping.
create index if not exists idx_bookings_shift_grouping
  on public.bookings (using_date, request_type, end_time);
create index if not exists idx_bookings_requester_emp
  on public.bookings (requester_employee_id);
create index if not exists idx_bookings_dept_date
  on public.bookings (requester_department, using_date);
create index if not exists idx_bookings_ot_verification
  on public.bookings (ot_verification_status, using_date)
  where request_type = 'overtime';

-- Soft deletion preserves historical references to fleet resources.
alter table public.vehicles add column if not exists deleted_at timestamptz;
alter table public.drivers add column if not exists deleted_at timestamptz;
create index if not exists idx_vehicles_active_deleted
  on public.vehicles (is_active, deleted_at);
create index if not exists idx_drivers_active_deleted
  on public.drivers (is_active, deleted_at);

-- API/webhook idempotency records are service-owned.
create table if not exists public.api_idempotency_records (
  idempotency_key text primary key,
  endpoint text not null,
  request_hash text not null,
  status_code integer not null,
  response_payload jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists idx_idempotency_expires_at
  on public.api_idempotency_records (expires_at);
alter table public.api_idempotency_records enable row level security;
revoke all on public.api_idempotency_records from public, anon, authenticated;
grant select, insert, update, delete on public.api_idempotency_records to service_role;

-- Atomically consume a durable rate-limit slot. The advisory lock serializes
-- requests for one fingerprint across all Edge Function instances.
create or replace function public.consume_rate_limit(
  p_fingerprint text,
  p_limit integer default 20,
  p_window_seconds integer default 60
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_oldest timestamptz;
begin
  if nullif(btrim(p_fingerprint), '') is null
     or p_limit < 1 or p_limit > 10000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit parameters.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint, 0));

  delete from public.public_request_attempts
  where fingerprint = p_fingerprint
    and created_at < v_now - make_interval(secs => p_window_seconds);

  select count(*)::integer, min(created_at)
    into v_count, v_oldest
  from public.public_request_attempts
  where fingerprint = p_fingerprint
    and created_at >= v_now - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return query select false, 0, v_oldest + make_interval(secs => p_window_seconds);
    return;
  end if;

  insert into public.public_request_attempts (fingerprint) values (p_fingerprint);
  return query
    select true, p_limit - v_count - 1,
      coalesce(v_oldest, v_now) + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- Audit records are immutable to application users. Trigger functions and the
-- service role can append records without a permissive client INSERT policy.
alter table public.audit_logs enable row level security;
drop policy if exists "admin_read_audit_logs" on public.audit_logs;
drop policy if exists "audit_logs_read_admin_only" on public.audit_logs;
drop policy if exists "audit_logs_insert_auth" on public.audit_logs;
drop policy if exists "audit_logs_no_direct_update" on public.audit_logs;
drop policy if exists "audit_logs_no_direct_delete" on public.audit_logs;
create policy audit_logs_read_admin_only on public.audit_logs
  for select to authenticated
  using (public.app_role() = 'admin');
revoke insert, update, delete on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

-- PostgreSQL grants EXECUTE to PUBLIC for new functions unless it is revoked.
-- Remove that implicit path from all existing SECURITY DEFINER functions;
-- explicit authenticated/service_role grants created by earlier migrations stay.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public', fn.signature);
  end loop;
end;
$$;

-- These read-only helpers are intentionally callable by signed-in users and
-- are required by RLS policies/default expressions.
grant execute on function public.app_role() to authenticated;
grant execute on function public.app_department_id() to authenticated;
grant execute on function public.can_view_booking(uuid, uuid, uuid) to authenticated;
grant execute on function public.generate_booking_no() to authenticated, service_role;

alter default privileges in schema public revoke execute on functions from public;

commit;
