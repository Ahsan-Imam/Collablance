-- Project applications: a team applies to take on an open, unassigned
-- project; the client reviews applications and accepts one, which assigns
-- the project to that team and opens its workspace (reusing the existing
-- acceptance flow in lib/projectAcceptance.js). Run in your Supabase SQL
-- editor.

create table if not exists project_applications (
  id            uuid default gen_random_uuid() primary key,
  project_id    uuid references projects(id) on delete cascade not null,
  collective_id uuid references collectives(id) on delete cascade not null,
  applied_by    uuid references auth.users(id) on delete cascade not null,
  message       text,
  status        text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at    timestamptz default now(),
  responded_at  timestamptz
);

-- A team can have at most one active (pending) application per project —
-- but can re-apply after withdrawing or being rejected
create unique index if not exists project_applications_unique_pending
  on project_applications (project_id, collective_id)
  where status = 'pending';

alter table project_applications enable row level security;

-- The project owner sees all applications for their project; any member of
-- the applying team can see their own team's applications
create policy "project_applications: owner or team member can read"
  on project_applications for select
  to authenticated
  using (
    exists (select 1 from projects p where p.id = project_applications.project_id and p.owner_id = auth.uid())
    or exists (
      select 1 from collective_members cm
      where cm.collective_id = project_applications.collective_id and cm.user_id = auth.uid()
    )
  );

-- Only a team owner/admin can apply on behalf of their team, and only to
-- an open project that isn't already assigned to a team
create policy "project_applications: team lead can insert"
  on project_applications for insert
  to authenticated
  with check (
    applied_by = auth.uid()
    and exists (
      select 1 from collective_members cm
      where cm.collective_id = project_applications.collective_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
    and exists (
      select 1 from projects p
      where p.id = project_applications.project_id
        and p.status = 'open'
        and p.collective_id is null
    )
  );

-- The project owner can accept/reject; a team owner/admin can withdraw
-- their own team's application
create policy "project_applications: owner or team lead can update"
  on project_applications for update
  to authenticated
  using (
    exists (select 1 from projects p where p.id = project_applications.project_id and p.owner_id = auth.uid())
    or exists (
      select 1 from collective_members cm
      where cm.collective_id = project_applications.collective_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

alter publication supabase_realtime add table project_applications;
