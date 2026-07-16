begin;

create or replace function public.enforce_ot_request_window()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if public.app_role() = 'requester'
     and new.request_type = 'overtime'
     and new.status = 'pending_approval'
     and (tg_op = 'INSERT' or old.status is distinct from 'pending_approval')
     and not public.ot_request_window_open() then
    raise exception 'OT requests can be submitted only from 08:00 to 17:00 (Asia/Bangkok).';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_ot_request_window on public.bookings;
create trigger enforce_ot_request_window
before insert or update on public.bookings
for each row execute function public.enforce_ot_request_window();

commit;
