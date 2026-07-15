begin;

create table public.line_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  line_user_id text unique not null,
  display_name text,
  picture_url text,
  is_active boolean not null default true,
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.line_link_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.line_notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  event_type text not null,
  idempotency_key text unique not null,
  status text not null check (status in ('pending','sent','failed','skipped')),
  line_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index line_link_codes_profile_idx on public.line_link_codes(profile_id);
create index line_notifications_booking_idx on public.line_notifications(booking_id, created_at desc);

alter table public.line_accounts enable row level security;
alter table public.line_link_codes enable row level security;
alter table public.line_notifications enable row level security;

create policy line_accounts_read on public.line_accounts for select to authenticated
using (profile_id = (select auth.uid()) or public.app_role() = 'admin');

create policy line_notifications_admin_read on public.line_notifications for select to authenticated
using (public.app_role() = 'admin');

grant select on public.line_accounts to authenticated;
grant select on public.line_notifications to authenticated;

create or replace function public.create_line_link_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
begin
  if public.app_role() <> 'driver' or not exists (
    select 1 from public.drivers
    where user_id = (select auth.uid()) and is_active
  ) then
    raise exception 'An active driver account is required.';
  end if;

  delete from public.line_link_codes
  where profile_id = (select auth.uid()) and used_at is null;

  loop
    generated_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    begin
      insert into public.line_link_codes (profile_id, code_hash, expires_at)
      values (
        (select auth.uid()),
        encode(digest(generated_code, 'sha256'), 'hex'),
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

create or replace function public.disconnect_line_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.line_accounts where profile_id = (select auth.uid());
end;
$$;

revoke all on function public.create_line_link_code() from public, anon;
revoke all on function public.disconnect_line_account() from public, anon;
grant execute on function public.create_line_link_code() to authenticated;
grant execute on function public.disconnect_line_account() to authenticated;

commit;
