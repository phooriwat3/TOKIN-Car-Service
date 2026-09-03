begin;

create table public.email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  request_no text,
  request_type text check (request_type in ('overtime','outside_company')),
  recipient_email text not null,
  event text not null,
  status text not null check (status in ('sent','failed','not_configured')),
  created_at timestamptz not null default now()
);

create index email_delivery_logs_created_idx on public.email_delivery_logs(created_at desc);
alter table public.email_delivery_logs enable row level security;
create policy email_delivery_logs_admin_read on public.email_delivery_logs
  for select to authenticated using (public.app_role() = 'admin');
grant select on public.email_delivery_logs to authenticated;

commit;
