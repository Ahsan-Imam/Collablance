-- Lets a team owner promote a member to Team Leader (the existing 'admin'
-- role) or demote them back — there was previously no UPDATE policy on
-- collective_members at all. Run in your Supabase SQL editor.

create policy "collective_members: owner can update roles"
  on collective_members for update
  to authenticated
  using (
    exists (select 1 from collectives c where c.id = collective_members.collective_id and c.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from collectives c where c.id = collective_members.collective_id and c.owner_id = auth.uid())
  );
