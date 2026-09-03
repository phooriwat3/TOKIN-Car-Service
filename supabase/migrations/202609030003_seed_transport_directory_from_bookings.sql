-- Make known requesters from existing transport bookings searchable without M365.
update public.employee_transport_directory d
set
  full_name = source.requester_name,
  department = coalesce(nullif(source.requester_department, ''), 'UNASSIGNED'),
  is_active = true,
  updated_at = now()
from (
  select distinct on (lower(b.requester_email))
    b.requester_name, b.requester_department, lower(b.requester_email) as email
  from public.bookings b
  where coalesce(b.requester_name, '') <> ''
    and b.requester_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  order by lower(b.requester_email), b.created_at desc
) source
where lower(d.email) = source.email;

insert into public.employee_transport_directory (
  employee_id, full_name, email, department, job_title, is_active
)
select distinct on (b.requester_employee_id)
  b.requester_employee_id,
  b.requester_name,
  lower(b.requester_email),
  coalesce(nullif(b.requester_department, ''), 'UNASSIGNED'),
  '',
  true
from public.bookings b
where coalesce(b.requester_employee_id, '') <> ''
  and coalesce(b.requester_name, '') <> ''
  and b.requester_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  and not exists (
    select 1 from public.employee_transport_directory d
    where lower(d.email) = lower(b.requester_email)
  )
order by b.requester_employee_id, b.created_at desc
on conflict (employee_id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  department = excluded.department,
  is_active = true,
  updated_at = now();
