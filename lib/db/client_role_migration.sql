-- ============================================================
-- CollabLance — Client / Freelancer roles
-- Run AFTER setup.sql and app_schema.sql. Safe to re-run.
--
-- * profiles.role is 'freelancer' or 'client', chosen at signup
-- * the role is locked: signed-in users cannot change it
--   (only the SQL editor / service_role can)
-- * only clients can create projects
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. role column
-- ─────────────────────────────────────────────────────────────
alter table profiles
  add column if not exists role text not null default 'freelancer';

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles
  add constraint profiles_role_check check (role in ('freelancer', 'client'));

-- ─────────────────────────────────────────────────────────────
-- 2. Copy the signup choice into the profile on account creation
--    (signup passes it as user metadata: { role: 'client' })
-- ─────────────────────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    case when new.raw_user_meta_data->>'role' = 'client' then 'client' else 'freelancer' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────
-- 3. Lock the role
--    Requests from signed-in users (auth.role() = 'authenticated')
--    can never set or change it. Signup (via handle_new_user above),
--    the SQL editor and service_role are unaffected.
-- ─────────────────────────────────────────────────────────────
create or replace function lock_profile_role()
returns trigger as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' then
      new.role := 'freelancer';
    else
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists profiles_lock_role on profiles;
create trigger profiles_lock_role
  before insert or update on profiles
  for each row execute function lock_profile_role();

-- ─────────────────────────────────────────────────────────────
-- 4. Backfill: create missing profiles for existing users and
--    set every role from the signup metadata
-- ─────────────────────────────────────────────────────────────
insert into profiles (id, full_name, role)
select
  u.id,
  u.raw_user_meta_data->>'full_name',
  case when u.raw_user_meta_data->>'role' = 'client' then 'client' else 'freelancer' end
from auth.users u
on conflict (id) do nothing;

update profiles p
set role = case when u.raw_user_meta_data->>'role' = 'client' then 'client' else 'freelancer' end
from auth.users u
where u.id = p.id;

-- ─────────────────────────────────────────────────────────────
-- 5. Only clients can create projects
-- ─────────────────────────────────────────────────────────────
drop policy if exists "projects: auth insert" on projects;
drop policy if exists "projects: client insert" on projects;
create policy "projects: client insert"
  on projects for insert to authenticated
  with check (
    auth.uid() = owner_id
    and exists (select 1 from profiles where id = auth.uid() and role = 'client')
  );

-- Make the API pick up the new column right away
notify pgrst, 'reload schema';
