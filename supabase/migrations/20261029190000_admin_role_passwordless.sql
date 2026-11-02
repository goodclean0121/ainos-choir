-- Anyone can call the public sign-up endpoint with an admin's email and a password.
-- Grant the admin role only to passwordless accounts (created by the emailed login link),
-- so a sign-up with a password never becomes an admin.
create or replace function private.grant_admin_role() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from private.admin_emails a where a.email = lower(new.email))
     and coalesce(new.encrypted_password, '') = '' then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb;
  else
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) - 'role';
  end if;
  return new;
end;
$$;
revoke execute on function private.grant_admin_role() from public, anon, authenticated;

drop trigger if exists grant_admin_role on auth.users;
create trigger grant_admin_role before insert or update of email, encrypted_password on auth.users
  for each row execute function private.grant_admin_role();

-- The secret key (service_role) serves members; state its access instead of relying on defaults.
grant select, insert, update, delete on public.songs, public.choir_access to service_role;
