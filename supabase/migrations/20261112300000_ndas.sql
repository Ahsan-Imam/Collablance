-- Project NDAs: the client can ask the assigned team to sign a standard NDA.
-- The filled-in text is stored once and can never be edited; signatures can
-- only be added, never changed or removed. Additive. Safe to re-run.

create table if not exists project_ndas (
  id            uuid default gen_random_uuid() primary key,
  project_id    uuid references projects(id) on delete cascade not null unique,
  collective_id uuid references collectives(id) on delete cascade not null,
  created_by    uuid references auth.users(id) not null,
  version       text not null,
  body          text not null,
  created_at    timestamptz default now()
);

create table if not exists nda_signatures (
  nda_id      uuid references project_ndas(id) on delete cascade not null,
  user_id     uuid references auth.users(id) not null,
  signed_name text not null,
  signed_at   timestamptz default now(),
  primary key (nda_id, user_id)
);

alter table project_ndas enable row level security;
alter table nda_signatures enable row level security;

-- The client and the team it was made for can read it
drop policy if exists "project_ndas: participant can read" on project_ndas;
create policy "project_ndas: participant can read"
  on project_ndas for select to authenticated
  using (
    exists (select 1 from projects p where p.id = project_ndas.project_id and p.owner_id = auth.uid())
    or exists (select 1 from collective_members cm where cm.collective_id = project_ndas.collective_id and cm.user_id = auth.uid())
  );

-- Only the project's client creates it, and only for the team on the project
drop policy if exists "project_ndas: client can create" on project_ndas;
create policy "project_ndas: client can create"
  on project_ndas for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from projects p
      where p.id = project_ndas.project_id and p.owner_id = auth.uid() and p.collective_id = project_ndas.collective_id
    )
  );

drop policy if exists "nda_signatures: participant can read" on nda_signatures;
create policy "nda_signatures: participant can read"
  on nda_signatures for select to authenticated
  using (exists (
    select 1 from project_ndas n
    where n.id = nda_signatures.nda_id
      and (exists (select 1 from projects p where p.id = n.project_id and p.owner_id = auth.uid())
        or exists (select 1 from collective_members cm where cm.collective_id = n.collective_id and cm.user_id = auth.uid()))
  ));

-- You can only sign for yourself, and only if you are the client or on the team
drop policy if exists "nda_signatures: participant can sign" on nda_signatures;
create policy "nda_signatures: participant can sign"
  on nda_signatures for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from project_ndas n
      where n.id = nda_signatures.nda_id
        and (exists (select 1 from projects p where p.id = n.project_id and p.owner_id = auth.uid())
          or exists (select 1 from collective_members cm where cm.collective_id = n.collective_id and cm.user_id = auth.uid()))
    )
  );

-- No update or delete policies on either table: an NDA and its signatures are permanent.

notify pgrst, 'reload schema';
