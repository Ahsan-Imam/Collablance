-- Deliverable files for milestones (dispute evidence), in a private bucket.
-- Path: <project_id>/<milestone_id>/<file>. Kept apart from the other
-- migrations because it needs Supabase's storage schema (the local test stub
-- in supabase/tests has none).

insert into storage.buckets (id, name, public, file_size_limit)
values ('deliverables', 'deliverables', false, 52428800) -- 50 MB per file
on conflict (id) do nothing;

-- The client and the project's team can read
drop policy if exists "deliverables: participant can read" on storage.objects;
create policy "deliverables: participant can read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'deliverables'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
        and (p.owner_id = auth.uid()
          or exists (select 1 from public.collective_members cm where cm.collective_id = p.collective_id and cm.user_id = auth.uid()))
    )
  );

-- Only the team uploads, and only before the milestone is submitted.
-- No update/delete policy on purpose: evidence can't be swapped or removed.
drop policy if exists "deliverables: team can upload" on storage.objects;
create policy "deliverables: team can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'deliverables'
    and exists (
      select 1 from public.milestones m
      join public.projects p on p.id = m.project_id
      join public.collective_members cm on cm.collective_id = p.collective_id
      where p.id::text = (storage.foldername(name))[1]
        and m.id::text = (storage.foldername(name))[2]
        and m.status = 'pending'
        and cm.user_id = auth.uid()
    )
  );
