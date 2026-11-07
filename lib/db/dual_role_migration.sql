-- ============================================================
-- CollabLance — one account, both roles
-- Run AFTER client_role_migration.sql and
-- google_client_signup_migration.sql. Safe to re-run.
--
-- Supabase Auth allows one account per email, so "same email as
-- client and freelancer" means one account that can hold both roles:
--
--   is_client / is_freelancer   which roles the account has
--   role                        the active mode ('client' | 'freelancer')
--
-- * signup grants the chosen role
-- * add_role(r)    grants another role and switches to it
-- * switch_role(r) switches between roles the account already has
-- * nothing else can change these columns (API updates are ignored)
-- * posting projects requires is_client
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Capability columns (backfilled from the old single role,
--    only the first time they're added)
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_client'
  ) then
    alter table profiles add column is_client boolean not null default false;
    alter table profiles add column is_freelancer boolean not null default true;
    update profiles set is_client = true, is_freelancer = false where role = 'client';
  end if;
end $$;

-- The active mode must be a role the account has, and it must have at least one
alter table profiles drop constraint if exists profiles_has_a_role;
alter table profiles
  add constraint profiles_has_a_role check (is_client or is_freelancer);

alter table profiles drop constraint if exists profiles_active_role_granted;
alter table profiles
  add constraint profiles_active_role_granted check (
    (role = 'client' and is_client) or (role = 'freelancer' and is_freelancer)
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Signup grants the chosen role
-- ─────────────────────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
declare
  chosen text := case when new.raw_user_meta_data->>'role' = 'client' then 'client' else 'freelancer' end;
begin
  insert into public.profiles (id, full_name, role, is_client, is_freelancer)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    chosen,
    chosen = 'client',
    chosen = 'freelancer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────
-- 3. Lock role columns against direct API writes
--    (add_role / switch_role are SECURITY DEFINER, so they pass)
-- ─────────────────────────────────────────────────────────────
create or replace function lock_profile_role()
returns trigger as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.role := 'freelancer';
      new.is_freelancer := true;
      new.is_client := false;
    else
      new.role := old.role;
      new.is_client := old.is_client;
      new.is_freelancer := old.is_freelancer;
    end if;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

-- ─────────────────────────────────────────────────────────────
-- 4. add_role / switch_role — the only ways to change roles
--    Both return the active role afterwards.
-- ─────────────────────────────────────────────────────────────
create or replace function add_role(new_role text)
returns text as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if new_role not in ('client', 'freelancer') then
    raise exception 'role must be client or freelancer';
  end if;

  update profiles
  set is_client     = is_client or new_role = 'client',
      is_freelancer = is_freelancer or new_role = 'freelancer',
      role          = new_role
  where id = uid;

  if not found then raise exception 'profile not found'; end if;
  return new_role;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function switch_role(new_role text)
returns text as $$
declare
  uid uuid := auth.uid();
  has_it boolean;
begin
  if uid is null then raise exception 'not signed in'; end if;

  select case new_role when 'client' then is_client when 'freelancer' then is_freelancer end
    into has_it
  from profiles where id = uid;

  if has_it is not true then
    raise exception 'account does not have the % role — add it first', new_role;
  end if;

  update profiles set role = new_role where id = uid;
  return new_role;
end;
$$ language plpgsql security definer set search_path = public;

-- Kept so older deployments' OAuth callback keeps working: now just adds client
create or replace function claim_client_role()
returns text as $$
  select add_role('client');
$$ language sql security definer set search_path = public;

revoke all on function add_role(text) from public, anon;
revoke all on function switch_role(text) from public, anon;
revoke all on function claim_client_role() from public, anon;
grant execute on function add_role(text) to authenticated;
grant execute on function switch_role(text) to authenticated;
grant execute on function claim_client_role() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Posting projects needs client access (not the active mode)
-- ─────────────────────────────────────────────────────────────
drop policy if exists "projects: client insert" on projects;
create policy "projects: client insert"
  on projects for insert to authenticated
  with check (
    auth.uid() = owner_id
    and exists (select 1 from profiles where id = auth.uid() and is_client)
  );

notify pgrst, 'reload schema';
