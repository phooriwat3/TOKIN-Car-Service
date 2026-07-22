begin;

alter table public.overtime_employees
  add column if not exists employee_email text,
  add column if not exists assigned_vehicle_id uuid references public.vehicles(id),
  add column if not exists assigned_driver_id uuid references public.drivers(id),
  add column if not exists assigned_notes text;

commit;
