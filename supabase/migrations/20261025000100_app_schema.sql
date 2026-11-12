-- ============================================================
-- CollabLance — Collectives + Projects + Profiles schema
-- Append this to your existing setup.sql OR run separately
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PROFILES  (extends auth.users with public freelancer data)
-- ─────────────────────────────────────────────────────────────
create table if not exists profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text,
  bio              text,
  avatar_url       text,
  location         text,
  portfolio_url    text,
  hourly_rate      numeric(10,2),
  experience_years int,
  skills           text[]   default '{}',
  is_available     boolean  default true,
  updated_at       timestamptz default now(),
  created_at       timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles: public read"
  on profiles for select using (true);

create policy "profiles: own insert"
  on profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "profiles: own update"
  on profiles for update to authenticated
  using (auth.uid() = id);

-- Auto-create profile row on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- COLLECTIVES
-- ─────────────────────────────────────────────────────────────
create table if not exists collectives (
  id          uuid default gen_random_uuid() primary key,
  owner_id    uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  description text,
  focus_area  text check (focus_area in (
    'web_development','mobile_development','design','content',
    'data_science','devops','fullstack','other'
  )),
  avatar_initial text,
  is_public   boolean default true,
  updated_at  timestamptz default now(),
  created_at  timestamptz default now()
);

alter table collectives enable row level security;

create policy "collectives: public read"
  on collectives for select using (true);

create policy "collectives: auth insert"
  on collectives for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "collectives: owner update"
  on collectives for update to authenticated
  using (auth.uid() = owner_id);

create policy "collectives: owner delete"
  on collectives for delete to authenticated
  using (auth.uid() = owner_id);

create trigger collectives_updated_at
  before update on collectives
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- COLLECTIVE MEMBERS
-- ─────────────────────────────────────────────────────────────
create table if not exists collective_members (
  id            uuid default gen_random_uuid() primary key,
  collective_id uuid references collectives(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  role          text default 'member' check (role in ('owner','admin','member')),
  joined_at     timestamptz default now(),
  unique (collective_id, user_id)
);

alter table collective_members enable row level security;

create policy "collective_members: members can read"
  on collective_members for select using (true);

create policy "collective_members: owner can insert"
  on collective_members for insert to authenticated
  with check (auth.uid() = user_id);

create policy "collective_members: owner can delete"
  on collective_members for delete to authenticated
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────────────────────
create table if not exists projects (
  id            uuid default gen_random_uuid() primary key,
  collective_id uuid references collectives(id) on delete set null,
  owner_id      uuid references auth.users(id) on delete cascade not null,
  title         text not null,
  description   text not null,
  budget_min    numeric(12,2),
  budget_max    numeric(12,2),
  currency      text default 'INR',
  status        text default 'open' check (status in ('open','in_progress','completed','cancelled')),
  skills_needed text[] default '{}',
  deadline      date,
  updated_at    timestamptz default now(),
  created_at    timestamptz default now()
);

alter table projects enable row level security;

create policy "projects: public read"
  on projects for select using (true);

create policy "projects: auth insert"
  on projects for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "projects: owner update"
  on projects for update to authenticated
  using (auth.uid() = owner_id);

create policy "projects: owner delete"
  on projects for delete to authenticated
  using (auth.uid() = owner_id);

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table collectives;
alter publication supabase_realtime add table collective_members;
alter publication supabase_realtime add table projects;
