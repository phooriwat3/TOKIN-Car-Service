begin;

create or replace function public.ot_request_window_open()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (now() at time zone 'Asia/Bangkok')::time >= time '08:00'
     and (now() at time zone 'Asia/Bangkok')::time < time '17:01'
$$;

drop policy if exists bookings_requester_insert on public.bookings;
create policy bookings_requester_insert on public.bookings for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and department_id = public.app_department_id()
  and public.app_role() = 'requester'
  and status in ('draft','pending_approval')
  and (request_type <> 'overtime' or public.ot_request_window_open())
);

-- Recreate resubmission with an early guard while preserving the function body
-- from the previous migration through a wrapper used by the client.
create or replace function public.assert_ot_request_window(p_request_type text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_request_type = 'overtime' and not public.ot_request_window_open() then
    raise exception 'OT requests can be submitted only from 08:00 to 17:00 (Asia/Bangkok).';
  end if;
end;
$$;

revoke all on function public.ot_request_window_open() from public;
revoke all on function public.assert_ot_request_window(text) from public;
grant execute on function public.ot_request_window_open() to authenticated;
grant execute on function public.assert_ot_request_window(text) to authenticated;

commit;
