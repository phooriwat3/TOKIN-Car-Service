begin;

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
    generated_code := upper(substr(
      pg_catalog.encode(extensions.gen_random_bytes(6), 'hex'),
      1,
      8
    ));
    begin
      insert into public.line_link_codes (profile_id, code_hash, expires_at)
      values (
        (select auth.uid()),
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

revoke all on function public.create_line_link_code() from public, anon;
grant execute on function public.create_line_link_code() to authenticated;

commit;
