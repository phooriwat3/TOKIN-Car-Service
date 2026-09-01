-- Make external approval decisions atomic and safe to retry.
begin;

create or replace function public.process_approval_callback(
  p_booking_id uuid,
  p_action text,
  p_comments text,
  p_approver_name text,
  p_approver_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.bookings;
begin
  if p_action not in ('approved', 'rejected') then
    raise exception 'Approval action is invalid.';
  end if;
  if p_action = 'rejected' and length(trim(coalesce(p_comments, ''))) = 0 then
    raise exception 'Comments are required for a rejection.';
  end if;

  select * into target
  from public.bookings
  where id = p_booking_id
  for update;

  if target.id is null then
    raise exception 'Request not found.';
  end if;
  if target.status <> 'pending_approval' then
    return jsonb_build_object(
      'outcome', 'already_processed',
      'booking_id', target.id,
      'status', target.status
    );
  end if;

  insert into public.approvals (
    booking_id, approver_id, approver_name, approver_email, action, comments
  ) values (
    target.id,
    null,
    nullif(trim(coalesce(p_approver_name, '')), ''),
    nullif(lower(trim(coalesce(p_approver_email, ''))), ''),
    p_action,
    coalesce(p_comments, '')
  );

  update public.bookings
  set
    status = p_action,
    reject_reason = case when p_action = 'rejected' then p_comments else null end,
    updated_at = now()
  where id = target.id;

  return jsonb_build_object(
    'outcome', 'processed',
    'booking_id', target.id,
    'status', p_action
  );
end;
$$;

revoke all on function public.process_approval_callback(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.process_approval_callback(uuid, text, text, text, text) to service_role;

commit;
