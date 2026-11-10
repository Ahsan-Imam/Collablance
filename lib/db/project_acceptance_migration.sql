-- Project acceptance: a collective owner/admin "accepts" a project that was
-- posted for their team, opening that project's workspace (context board).
-- Run this in your Supabase SQL editor.

alter table projects
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by uuid references auth.users(id);

-- Collective owner/admin can update the project they're accepting
-- (in addition to the existing owner-only update policy).
drop policy if exists "projects: collective lead can accept" on projects;
create policy "projects: collective lead can accept"
  on projects for update
  to authenticated
  using (
    exists (
      select 1 from collective_members cm
      where cm.collective_id = projects.collective_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from collective_members cm
      where cm.collective_id = projects.collective_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );
