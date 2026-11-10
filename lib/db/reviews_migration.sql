-- Ratings & reputation: client <-> team reviews, one per project per
-- direction. Run in your Supabase SQL editor.

create table if not exists reviews (
  id            uuid default gen_random_uuid() primary key,
  project_id    uuid references projects(id) on delete cascade not null,
  reviewer_id   uuid references auth.users(id) on delete cascade not null,
  direction     text not null check (direction in ('client_to_team', 'team_to_client')),
  collective_id uuid references collectives(id) on delete cascade,   -- set when direction = client_to_team
  rated_user_id uuid references auth.users(id) on delete cascade,    -- set when direction = team_to_client (= project.owner_id)
  rating        int not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz default now(),
  unique (project_id, reviewer_id, direction)
);

alter table reviews enable row level security;

-- Reviews are public — reputation only works if everyone can see it
create policy "reviews: public read"
  on reviews for select using (true);

create policy "reviews: reviewer can insert their own"
  on reviews for insert
  to authenticated
  with check (auth.uid() = reviewer_id);

alter publication supabase_realtime add table reviews;
