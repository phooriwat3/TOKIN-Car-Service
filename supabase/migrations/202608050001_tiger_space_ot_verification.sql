begin;

-- Transport requests can be submitted before Tiger Space approval. The
-- transport portal tracks verification separately and never becomes a second
-- OT approval system.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check (status in (
  'draft','pending_approval','pending_ot_verification','changes_requested',
  'approved','rejected','assigned','scheduled','in_progress','completed','cancelled'
));

alter table public.bookings
  add column if not exists ot_verification_status text not null default 'not_required'
    check (ot_verification_status in (
      'not_required','pending','verified','not_found','rejected'
    )),
  add column if not exists ot_verified_at timestamptz,
  add column if not exists ot_verified_by uuid references public.profiles(id),
  add column if not exists ot_verification_note text;

comment on column public.bookings.ot_verification_status is
  'Result of matching an OT transport request against a Tiger Space report.';
comment on column public.bookings.ot_verification_note is
  'Optional HR/GA note, including report date or the reason a match was not found.';

-- OT requests created by the previous transport-only implementation were
-- marked approved from the employee declaration alone. Unassigned records must
-- be checked against Tiger Space before transport is confirmed.
update public.bookings
set
  status = case
    when status = 'approved' then 'pending_ot_verification'
    else status
  end,
  ot_verification_status = case
    when status in ('assigned','scheduled','in_progress','completed') then 'verified'
    when status = 'rejected' then 'rejected'
    else 'pending'
  end,
  ot_verified_at = case
    when status in ('assigned','scheduled','in_progress','completed') then coalesce(updated_at, now())
    else null
  end
where request_type = 'overtime';

create or replace function public.verify_tiger_space_booking(
  p_booking_id uuid,
  p_result text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.bookings;
begin
  if public.app_role() <> 'admin' then
    raise exception 'Admin role required.';
  end if;
  if p_result not in ('pending','verified','not_found','rejected') then
    raise exception 'Invalid Tiger Space verification result.';
  end if;

  select * into target
  from public.bookings
  where id = p_booking_id
  for update;

  if target.id is null then
    raise exception 'Request not found.';
  end if;
  if target.request_type <> 'overtime' then
    raise exception 'Tiger Space verification applies only to OT transport requests.';
  end if;
  if target.status in ('assigned','scheduled','in_progress','completed','cancelled') then
    raise exception 'This request can no longer change OT verification status.';
  end if;

  update public.bookings
  set
    ot_verification_status = p_result,
    ot_verification_note = nullif(btrim(coalesce(p_note, '')), ''),
    ot_verified_at = case when p_result = 'verified' then now() else null end,
    ot_verified_by = case when p_result = 'verified' then auth.uid() else null end,
    status = case
      when p_result = 'verified' then 'approved'
      when p_result = 'rejected' then 'rejected'
      else 'pending_ot_verification'
    end,
    reject_reason = case
      when p_result = 'rejected' then coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'OT was not approved in Tiger Space.')
      else null
    end,
    updated_at = now()
  where id = p_booking_id;
end;
$$;

revoke all on function public.verify_tiger_space_booking(uuid, text, text) from public;
grant execute on function public.verify_tiger_space_booking(uuid, text, text) to authenticated;

create index if not exists bookings_ot_verification_queue_idx
  on public.bookings(using_date, requester_department, ot_verification_status)
  where request_type = 'overtime';

notify pgrst, 'reload schema';
commit;
