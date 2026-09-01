-- Keep employee profiles private while exposing the minimum approver directory
-- needed by authenticated request forms.
begin;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.app_role() = 'admin');

create or replace view public.active_approver_directory as
select p.id, p.full_name, p.email, d.name as department_name
from public.profiles p
left join public.departments d on d.id = p.department_id
where p.role = 'approver' and p.is_active;

revoke all on public.active_approver_directory from public, anon;
grant select on public.active_approver_directory to authenticated;

comment on view public.active_approver_directory is
  'Minimal active approver directory exposed to authenticated request forms.';

commit;
