-- Team invites: a team owner/admin invites a specific freelancer, who sees
-- it in their Inbox and can accept or decline. Run in your Supabase SQL
-- editor.

create table if not exists team_invites (
  id              uuid default gen_random_uuid() primary key,
  collective_id   uuid references collectives(id) on delete cascade not null,
  invited_user_id uuid references auth.users(id) on delete cascade not null,
  invited_by      uuid references auth.users(id) on delete cascade not null,
  status          text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at      timestamptz default now(),
  responded_at    timestamptz
);

-- Only one pending invite per (team, person) at a time
create unique index if not exists team_invites_unique_pending
  on team_invites (collective_id, invited_user_id)
  where status = 'pending';

alter table team_invites enable row level security;

-- The invited person sees their own invites; a team owner/admin sees
-- invites they're responsible for
create policy "team_invites: recipient or team lead can read"
  on team_invites for select
  to authenticated
  using (
    invited_user_id = auth.uid()
    or exists (
      select 1 from collective_members cm
      where cm.collective_id = team_invites.collective_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

-- Only a team owner/admin can send an invite for their team
create policy "team_invites: team lead can insert"
  on team_invites for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from collective_members cm
      where cm.collective_id = team_invites.collective_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

-- Only the invited person can respond to their own invite
create policy "team_invites: recipient can respond"
  on team_invites for update
  to authenticated
  using (invited_user_id = auth.uid())
  with check (invited_user_id = auth.uid());

alter publication supabase_realtime add table team_invites;
