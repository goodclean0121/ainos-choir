-- Songs and the choir passcode. Only admins (app_metadata.role = 'admin') touch these tables
-- through the Data API; members are served by the Next.js server with the secret key.

create schema if not exists private;

create or replace function private.is_admin() returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  xml text not null,
  roles jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  experimental boolean not null default false,
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- auto-recognised scores must be listened to before they go public
  constraint published_scores_checked check (status = 'draft' or not experimental or checked)
);
create index songs_status_updated_idx on public.songs (status, updated_at desc);

create table public.choir_access (
  id smallint primary key default 1 check (id = 1),
  passcode_hash text not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create or replace function private.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger songs_touch before update on public.songs
  for each row execute function private.touch_updated_at();

-- Changing the passcode bumps its version so every device must enter the new one.
create or replace function private.bump_access_version() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.passcode_hash is distinct from old.passcode_hash then
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger choir_access_bump before update on public.choir_access
  for each row execute function private.bump_access_version();

alter table public.songs enable row level security;
alter table public.choir_access enable row level security;

revoke all on public.songs, public.choir_access from anon;
grant select, insert, update, delete on public.songs to authenticated;
grant select, insert, update on public.choir_access to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create policy "admins read songs" on public.songs for select to authenticated
  using ((select private.is_admin()));
create policy "admins add songs" on public.songs for insert to authenticated
  with check ((select private.is_admin()));
create policy "admins change songs" on public.songs for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete songs" on public.songs for delete to authenticated
  using ((select private.is_admin()));

create policy "admins read passcode" on public.choir_access for select to authenticated
  using ((select private.is_admin()));
create policy "admins set passcode" on public.choir_access for insert to authenticated
  with check ((select private.is_admin()));
create policy "admins change passcode" on public.choir_access for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Admin list: an account with one of these emails gets app_metadata.role = 'admin'.
create table private.admin_emails (email text primary key check (email = lower(email)));
insert into private.admin_emails (email) values ('goodclean0121@gmail.com');

create or replace function private.grant_admin_role() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from private.admin_emails a where a.email = lower(new.email)) then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb;
  end if;
  return new;
end;
$$;
revoke execute on function private.grant_admin_role() from public, anon, authenticated;

create trigger grant_admin_role before insert or update of email on auth.users
  for each row execute function private.grant_admin_role();
