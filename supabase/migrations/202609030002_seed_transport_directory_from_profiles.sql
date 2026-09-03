-- Seed existing active system profiles into the no-login transport directory.
insert into public.employee_transport_directory (
  employee_id, full_name, email, department, job_title, is_active
)
select
  p.employee_id,
  p.full_name,
  p.email,
  coalesce(d.name, 'UNASSIGNED'),
  '',
  p.is_active
from public.profiles p
left join public.departments d on d.id = p.department_id
where p.is_active
on conflict (employee_id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  department = excluded.department,
  is_active = excluded.is_active,
  updated_at = now();
