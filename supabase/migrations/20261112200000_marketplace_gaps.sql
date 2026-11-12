-- Proposals with a price and timeline, platform admins, and dispute rulings.
-- Additive only. Safe to re-run.

-- ─────────────────────────────────────────────────────────────
-- 1. Proposals: a quote and a timeline, so clients can compare teams
-- ─────────────────────────────────────────────────────────────
alter table project_applications add column if not exists quote_amount numeric(12,2) check (quote_amount > 0);
alter table project_applications add column if not exists timeline_days int check (timeline_days > 0);

-- ─────────────────────────────────────────────────────────────
-- 2. Platform admins. A separate table (not a profiles column) because users
--    can update their own profiles row. No write policy: add an admin by hand
--    in the SQL editor:  insert into platform_admins values ('<user uuid>');
-- ─────────────────────────────────────────────────────────────
create table if not exists platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
alter table platform_admins enable row level security;
drop policy if exists "platform_admins: own read" on platform_admins;
create policy "platform_admins: own read"
  on platform_admins for select to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. Dispute rulings: append-only record of what an admin decided.
--    Written only by the server (service role) from /api/admin.
-- ─────────────────────────────────────────────────────────────
create table if not exists dispute_rulings (
  id           bigint generated always as identity primary key,
  milestone_id uuid references milestones(id) on delete restrict not null,
  ruled_by     uuid references auth.users(id) not null,
  outcome      text not null check (outcome in ('release_to_team', 'return_to_team', 'refund_client')),
  note         text not null,
  created_at   timestamptz default now()
);
alter table dispute_rulings enable row level security;
drop policy if exists "dispute_rulings: participant can read" on dispute_rulings;
create policy "dispute_rulings: participant can read"
  on dispute_rulings for select to authenticated
  using (exists (
    select 1 from milestones m join projects p on p.id = m.project_id
    where m.id = dispute_rulings.milestone_id
      and (p.owner_id = auth.uid()
        or exists (select 1 from collective_members cm where cm.collective_id = p.collective_id and cm.user_id = auth.uid()))
  ));

-- A dispute ruled for the client ends the milestone as 'refunded'. Users can't
-- set it: guard_milestone_write only allows the moves it lists.
alter table milestones drop constraint if exists milestones_status_check;
alter table milestones add constraint milestones_status_check
  check (status in ('pending', 'submitted', 'approved', 'paid', 'disputed', 'refunded'));

notify pgrst, 'reload schema';
