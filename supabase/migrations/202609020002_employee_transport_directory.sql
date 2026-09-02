begin;

create table public.employee_transport_directory (
  id uuid primary key default gen_random_uuid(),
  employee_id text unique not null,
  full_name text not null,
  email text unique not null,
  department text not null,
  job_title text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employee_transport_directory_search_idx
  on public.employee_transport_directory (full_name, employee_id)
  where is_active;

alter table public.employee_transport_directory enable row level security;

create or replace function public.set_employee_transport_directory_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger employee_transport_directory_updated_at
before update on public.employee_transport_directory
for each row execute function public.set_employee_transport_directory_updated_at();

commit;
