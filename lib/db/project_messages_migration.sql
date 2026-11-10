-- Basic team chat per project. Run in your Supabase SQL editor.

create table if not exists project_messages (
  id             uuid default gen_random_uuid() primary key,
  project_id     uuid references projects(id) on delete cascade not null,
  user_id        uuid references auth.users(id) on delete cascade not null,
  display_name   text,
  avatar_initial text,
  content        text not null,
  created_at     timestamptz default now()
);

alter table project_messages enable row level security;

create policy "project_messages: participant can read"
  on project_messages for select
  to authenticated
  using (
    exists (select 1 from projects p where p.id = project_messages.project_id and p.owner_id = auth.uid())
    or exists (
      select 1 from projects p
      join collective_members cm on cm.collective_id = p.collective_id
      where p.id = project_messages.project_id and cm.user_id = auth.uid()
    )
  );

create policy "project_messages: participant can insert"
  on project_messages for insert
  to authenticated
  with check (
    auth.uid() = user_id and (
      exists (select 1 from projects p where p.id = project_messages.project_id and p.owner_id = auth.uid())
      or exists (
        select 1 from projects p
        join collective_members cm on cm.collective_id = p.collective_id
        where p.id = project_messages.project_id and cm.user_id = auth.uid()
      )
    )
  );

alter publication supabase_realtime add table project_messages;
