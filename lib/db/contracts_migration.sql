-- Payment split contracts: the team leader proposes an integer % split of
-- a project's payout among current team members; every member must sign
-- before the team can accept the project (see lib/projectAcceptance.js and
-- app/api/applications/[id]/route.js). Run in your Supabase SQL editor.

create table if not exists project_contracts (
  id            uuid default gen_random_uuid() primary key,
  project_id    uuid references projects(id) on delete cascade not null,
  collective_id uuid references collectives(id) on delete cascade not null,
  created_by    uuid references auth.users(id) on delete cascade not null,
  splits        jsonb not null,  -- [{user_id, percent}] — set once at creation, validated server-side
  status        text default 'pending' check (status in ('pending', 'signed')),
  created_at    timestamptz default now(),
  locked_at     timestamptz,
  unique (project_id, collective_id)
);

create table if not exists contract_signatures (
  contract_id uuid references project_contracts(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  signed_at   timestamptz default now(),
  primary key (contract_id, user_id)
);

alter table project_contracts enable row level security;
alter table contract_signatures enable row level security;

create policy "project_contracts: owner or team member can read"
  on project_contracts for select to authenticated
  using (
    exists (select 1 from projects p where p.id = project_contracts.project_id and p.owner_id = auth.uid())
    or exists (select 1 from collective_members cm where cm.collective_id = project_contracts.collective_id and cm.user_id = auth.uid())
  );

create policy "project_contracts: team lead can insert"
  on project_contracts for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from collective_members cm
      where cm.collective_id = project_contracts.collective_id and cm.user_id = auth.uid() and cm.role in ('owner', 'admin')
    )
  );

-- Any team member can flip status to 'signed' (the API only does this once
-- everyone has a row in contract_signatures)
create policy "project_contracts: team member can update status"
  on project_contracts for update to authenticated
  using (exists (select 1 from collective_members cm where cm.collective_id = project_contracts.collective_id and cm.user_id = auth.uid()));

create policy "contract_signatures: owner or team member can read"
  on contract_signatures for select to authenticated
  using (
    exists (
      select 1 from project_contracts pc join projects p on p.id = pc.project_id
      where pc.id = contract_signatures.contract_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from project_contracts pc join collective_members cm on cm.collective_id = pc.collective_id
      where pc.id = contract_signatures.contract_id and cm.user_id = auth.uid()
    )
  );

create policy "contract_signatures: team member can sign"
  on contract_signatures for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from project_contracts pc join collective_members cm on cm.collective_id = pc.collective_id
      where pc.id = contract_signatures.contract_id and cm.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table project_contracts;
alter publication supabase_realtime add table contract_signatures;
