-- Milestones: per-project deliverables that get approved (and, once payments
-- are wired up, paid) one at a time. Run in your Supabase SQL editor.

create table if not exists milestones (
  id           uuid default gen_random_uuid() primary key,
  project_id   uuid references projects(id) on delete cascade not null,
  title        text not null,
  description  text,
  amount       numeric(12,2) not null,
  currency     text default 'INR',
  order_index  int default 0,
  status       text default 'pending' check (status in (
    'pending',    -- not started
    'submitted',  -- team says it's done, waiting on client
    'approved',   -- client approved, payment release pending
    'paid',       -- payment released (Phase: payments)
    'disputed'
  )),
  due_date     date,
  submitted_at timestamptz,
  approved_at  timestamptz,
  approved_by  uuid references auth.users(id),
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);

alter table milestones enable row level security;

-- Project owner (client) or any member of the project's team can read
create policy "milestones: participant can read"
  on milestones for select
  to authenticated
  using (
    exists (select 1 from projects p where p.id = milestones.project_id and p.owner_id = auth.uid())
    or exists (
      select 1 from projects p
      join collective_members cm on cm.collective_id = p.collective_id
      where p.id = milestones.project_id and cm.user_id = auth.uid()
    )
  );

-- Only the project owner defines milestones
create policy "milestones: owner can insert"
  on milestones for insert
  to authenticated
  with check (
    exists (select 1 from projects p where p.id = milestones.project_id and p.owner_id = auth.uid())
  );

-- Owner (approve) or team member (submit) can update — the API route
-- restricts which status transitions each role may make
create policy "milestones: participant can update"
  on milestones for update
  to authenticated
  using (
    exists (select 1 from projects p where p.id = milestones.project_id and p.owner_id = auth.uid())
    or exists (
      select 1 from projects p
      join collective_members cm on cm.collective_id = p.collective_id
      where p.id = milestones.project_id and cm.user_id = auth.uid()
    )
  );

create policy "milestones: owner can delete"
  on milestones for delete
  to authenticated
  using (
    exists (select 1 from projects p where p.id = milestones.project_id and p.owner_id = auth.uid())
  );

create trigger milestones_updated_at
  before update on milestones
  for each row execute function update_updated_at_column();

alter publication supabase_realtime add table milestones;
