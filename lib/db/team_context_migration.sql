-- Shared AI Context: run this in your Supabase SQL editor
-- Each member can post their context cards per collective/project

create table if not exists team_context (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  collective_id uuid,                        -- null = global workspace context
  project_id   uuid,                         -- optional project scope
  display_name text,                         -- member's display name (denormalized for speed)
  avatar_initial text,                       -- single char initial
  section      text not null check (section in (
    'building',      -- what I am building right now
    'perspective',   -- my vision / perspective
    'blockers',      -- what is blocking me
    'decisions',     -- decisions I have made
    'goals',         -- my goals for this sprint
    'context'        -- general context / notes
  )),
  title        text not null,
  content      text not null,
  tags         text[] default '{}',
  is_pinned    boolean default false,
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);

-- Enable realtime
alter publication supabase_realtime add table team_context;

-- RLS
alter table team_context enable row level security;

-- Anyone authenticated can read all context (team visibility)
create policy "authenticated users can read all context"
  on team_context for select
  to authenticated
  using (true);

-- Users can insert their own context
create policy "users insert own context"
  on team_context for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own context
create policy "users update own context"
  on team_context for update
  to authenticated
  using (auth.uid() = user_id);

-- Users can delete their own context
create policy "users delete own context"
  on team_context for delete
  to authenticated
  using (auth.uid() = user_id);

-- Trigger to keep updated_at current
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger team_context_updated_at
  before update on team_context
  for each row execute function update_updated_at_column();
