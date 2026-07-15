begin;

create table public.driver_line_accounts (
  driver_id uuid primary key references public.drivers(id) on delete cascade,
  line_user_id text unique not null,
  display_name text,
  picture_url text,
  is_active boolean not null default true,
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.driver_line_link_codes (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  code_hash text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index driver_line_link_codes_driver_idx
on public.driver_line_link_codes(driver_id);

-- Preserve LINE connections created through the original driver-login flow.
insert into public.driver_line_accounts (
  driver_id,
  line_user_id,
  display_name,
  picture_url,
  is_active,
  linked_at,
  updated_at
)
select
  d.id,
  la.line_user_id,
  la.display_name,
  la.picture_url,
  la.is_active,
  la.linked_at,
  la.updated_at
from public.line_accounts la
join public.drivers d on d.user_id = la.profile_id
on conflict (driver_id) do update set
  line_user_id = excluded.line_user_id,
  display_name = excluded.display_name,
  picture_url = excluded.picture_url,
  is_active = excluded.is_active,
  linked_at = excluded.linked_at,
  updated_at = excluded.updated_at;

alter table public.line_notifications
  add column driver_id uuid references public.drivers(id);

update public.line_notifications ln
set driver_id = d.id
from public.drivers d
where d.user_id = ln.profile_id;

alter table public.line_notifications
  alter column profile_id drop not null;

alter table public.line_notifications
  add constraint line_notifications_recipient_check
  check (profile_id is not null or driver_id is not null);

create index line_notifications_driver_idx
on public.line_notifications(driver_id, created_at desc);

alter table public.driver_line_accounts enable row level security;
alter table public.driver_line_link_codes enable row level security;

create policy driver_line_accounts_admin_read
on public.driver_line_accounts for select to authenticated
using (public.app_role() = 'admin');

grant select on public.driver_line_accounts to authenticated;
grant select, insert, update, delete
on table public.driver_line_accounts, public.driver_line_link_codes
to service_role;

create or replace function public.create_driver_line_link_code(p_driver_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
begin
  if public.app_role() <> 'admin' then
    raise exception 'Admin role required.';
  end if;

  if not exists (
    select 1 from public.drivers
    where id = p_driver_id and is_active
  ) then
    raise exception 'An active driver is required.';
  end if;

  delete from public.driver_line_link_codes
  where driver_id = p_driver_id and used_at is null;

  loop
    generated_code := upper(substr(
      pg_catalog.encode(extensions.gen_random_bytes(6), 'hex'),
      1,
      8
    ));
    begin
      insert into public.driver_line_link_codes (driver_id, code_hash, expires_at)
      values (
        p_driver_id,
        pg_catalog.encode(extensions.digest(generated_code, 'sha256'), 'hex'),
        now() + interval '10 minutes'
      );
      exit;
    exception when unique_violation then
      -- Generate another code in the extremely unlikely event of a collision.
    end;
  end loop;

  return generated_code;
end;
$$;

create or replace function public.disconnect_driver_line_account(p_driver_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.app_role() <> 'admin' then
    raise exception 'Admin role required.';
  end if;

  delete from public.driver_line_accounts where driver_id = p_driver_id;
  delete from public.line_accounts
  where profile_id = (
    select user_id from public.drivers where id = p_driver_id
  );
  delete from public.line_link_codes
  where profile_id = (
    select user_id from public.drivers where id = p_driver_id
  );


  delete from public.driver_line_link_codes where driver_id = p_driver_id;
end;
$$;

revoke all on function public.create_driver_line_link_code(uuid) from public, anon;
revoke all on function public.disconnect_driver_line_account(uuid) from public, anon;
grant execute on function public.create_driver_line_link_code(uuid) to authenticated;
grant execute on function public.disconnect_driver_line_account(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
