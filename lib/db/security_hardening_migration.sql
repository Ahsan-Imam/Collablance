-- Security hardening: make the database enforce the same rules the API
-- routes enforce. The browser holds the anon key + the user's session, so
-- anyone can call Supabase directly and skip app/api — RLS and triggers
-- are the real boundary. Run in your Supabase SQL editor AFTER every other
-- migration (needs project_contracts, contract_signatures,
-- project_applications to exist).
--
-- Writes made with no logged-in user (SQL editor, service role, future
-- Razorpay webhook) skip the triggers: auth.uid() is null there.

-- ─────────────────────────────────────────────────────────────
-- 1. collective_members — self-join only as a plain 'member'.
--    Only the team's real owner may add themselves with another role.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "collective_members: owner can insert" on collective_members;
drop policy if exists "collective_members: join as member" on collective_members;
create policy "collective_members: join as member"
  on collective_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      role = 'member'
      or exists (select 1 from collectives c where c.id = collective_members.collective_id and c.owner_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. projects — who may change what
-- ─────────────────────────────────────────────────────────────
create or replace function guard_project_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  ignore_cols text[] := array['accepted_at', 'accepted_by', 'status', 'updated_at'];
begin
  if uid is null then return new; end if;

  if tg_op = 'INSERT' then
    new.status := 'open';
    new.accepted_at := null;
    new.accepted_by := null;
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id then
    raise exception 'A project''s owner cannot be changed';
  end if;

  if old.accepted_at is not null and (
       new.accepted_at is distinct from old.accepted_at
    or new.accepted_by is distinct from old.accepted_by
    or new.collective_id is distinct from old.collective_id) then
    raise exception 'An accepted project cannot be reassigned';
  end if;

  -- Acceptance needs the whole team's signed split, however it's attempted
  if old.accepted_at is null and new.accepted_at is not null and not exists (
    select 1 from project_contracts pc
    where pc.project_id = new.id and pc.collective_id = new.collective_id and pc.status = 'signed'
  ) then
    raise exception 'All team members must sign the payment split contract first';
  end if;

  if uid <> old.owner_id then
    -- Team lead (via the "collective lead can accept" policy): accept only
    if (to_jsonb(new) - ignore_cols) is distinct from (to_jsonb(old) - ignore_cols) then
      raise exception 'A team lead can only accept a project, not edit it';
    end if;
    if new.accepted_by is distinct from old.accepted_by and new.accepted_by is distinct from uid then
      raise exception 'accepted_by must be you';
    end if;
    if new.status is distinct from old.status and not (old.status = 'open' and new.status = 'in_progress') then
      raise exception 'A team lead cannot change the project status';
    end if;
  elsif new.status = 'completed' and old.status <> 'completed' and exists (
    select 1 from milestones m where m.project_id = new.id and m.status in ('submitted', 'disputed')
  ) then
    raise exception 'Approve, return or resolve submitted/disputed milestones before completing the project';
  end if;

  return new;
end $$;

drop trigger if exists projects_guard on projects;
create trigger projects_guard
  before insert or update on projects
  for each row execute function guard_project_write();

-- Accepted projects hold milestones, contracts and chat (dispute evidence):
-- cancel them instead of deleting
drop policy if exists "projects: owner delete" on projects;
create policy "projects: owner delete"
  on projects for delete to authenticated
  using (auth.uid() = owner_id and accepted_at is null);

-- ─────────────────────────────────────────────────────────────
-- 3. milestones — status transitions per role; 'paid' never by a user
-- ─────────────────────────────────────────────────────────────
create or replace function guard_milestone_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_owner boolean;
  move text;
begin
  if uid is null then return new; end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.submitted_at := null;
    new.approved_at := null;
    new.approved_by := null;
    return new;
  end if;

  if new.project_id is distinct from old.project_id then
    raise exception 'A milestone cannot move between projects';
  end if;

  select coalesce(p.owner_id = uid, false) into is_owner from projects p where p.id = old.project_id;
  is_owner := coalesce(is_owner, false);

  if new.status is distinct from old.status then
    move := old.status || '>' || new.status;
    if not (
         (is_owner and move in ('submitted>pending', 'submitted>approved', 'submitted>disputed', 'approved>disputed'))
      or (not is_owner and move in ('pending>submitted', 'submitted>disputed', 'approved>disputed'))
    ) then
      raise exception 'Cannot move milestone from "%" to "%" with your role', old.status, new.status;
    end if;
  end if;

  if (new.title, new.description, new.amount, new.currency, new.due_date, new.order_index)
     is distinct from (old.title, old.description, old.amount, old.currency, old.due_date, old.order_index)
     and not (is_owner and old.status = 'pending') then
    raise exception 'Only the project owner can edit a milestone, and only before it is submitted';
  end if;

  if new.approved_by is distinct from old.approved_by and new.approved_by is distinct from uid then
    raise exception 'approved_by must be you';
  end if;

  return new;
end $$;

drop trigger if exists milestones_guard on milestones;
create trigger milestones_guard
  before insert or update on milestones
  for each row execute function guard_milestone_write();

-- ─────────────────────────────────────────────────────────────
-- 4. project_contracts — split validated on insert, never editable by
--    users; it locks itself once every member in the split has signed
-- ─────────────────────────────────────────────────────────────
drop policy if exists "project_contracts: team member can update status" on project_contracts;

create or replace function validate_contract_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  total numeric;
  bad int;
  member_count int;
  covered int;
begin
  if auth.uid() is null then return new; end if;

  new.status := 'pending';
  new.locked_at := null;

  if jsonb_typeof(new.splits) <> 'array' then
    raise exception 'splits must be an array';
  end if;

  select coalesce(sum((s->>'percent')::numeric), 0),
         count(*) filter (where (s->>'percent')::numeric <= 0 or (s->>'percent')::numeric <> trunc((s->>'percent')::numeric))
    into total, bad
    from jsonb_array_elements(new.splits) s;

  select count(*) into member_count from collective_members where collective_id = new.collective_id;

  select count(distinct cm.user_id) into covered
    from jsonb_array_elements(new.splits) s
    join collective_members cm on cm.collective_id = new.collective_id and cm.user_id::text = s->>'user_id';

  if total <> 100 or bad > 0 or covered <> member_count or jsonb_array_length(new.splits) <> member_count then
    raise exception 'The split must give every current team member a whole-number share, totalling exactly 100';
  end if;

  return new;
end $$;

drop trigger if exists project_contracts_validate on project_contracts;
create trigger project_contracts_validate
  before insert on project_contracts
  for each row execute function validate_contract_insert();

create or replace function lock_contract_when_fully_signed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update project_contracts pc
     set status = 'signed', locked_at = now()
   where pc.id = new.contract_id
     and pc.status = 'pending'
     and not exists (
       select 1 from jsonb_array_elements(pc.splits) s
       where not exists (
         select 1 from contract_signatures cs
         where cs.contract_id = pc.id and cs.user_id::text = s->>'user_id'
       )
     );
  return new;
end $$;

drop trigger if exists contract_signatures_lock on contract_signatures;
create trigger contract_signatures_lock
  after insert on contract_signatures
  for each row execute function lock_contract_when_fully_signed();

-- ─────────────────────────────────────────────────────────────
-- 5. reviews — only real participants of a completed project
-- ─────────────────────────────────────────────────────────────
drop policy if exists "reviews: reviewer can insert their own" on reviews;
create policy "reviews: reviewer can insert their own"
  on reviews for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from projects p
      where p.id = reviews.project_id
        and p.status = 'completed'
        and (
          (reviews.direction = 'client_to_team'
            and p.owner_id = auth.uid()
            and reviews.collective_id = p.collective_id
            and reviews.rated_user_id is null)
          or
          (reviews.direction = 'team_to_client'
            and reviews.rated_user_id = p.owner_id
            and reviews.collective_id is null
            and exists (select 1 from collective_members cm where cm.collective_id = p.collective_id and cm.user_id = auth.uid()))
        )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 6. project_applications — the client accepts/rejects; the team lead
--    can only withdraw. Both only while the application is pending.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "project_applications: owner or team lead can update" on project_applications;
drop policy if exists "project_applications: owner can respond" on project_applications;
drop policy if exists "project_applications: team lead can withdraw" on project_applications;

create policy "project_applications: owner can respond"
  on project_applications for update to authenticated
  using (
    status = 'pending'
    and exists (select 1 from projects p where p.id = project_applications.project_id and p.owner_id = auth.uid())
  )
  with check (
    status in ('accepted', 'rejected')
    and exists (select 1 from projects p where p.id = project_applications.project_id and p.owner_id = auth.uid())
  );

create policy "project_applications: team lead can withdraw"
  on project_applications for update to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from collective_members cm
      where cm.collective_id = project_applications.collective_id and cm.user_id = auth.uid() and cm.role in ('owner', 'admin')
    )
  )
  with check (
    status = 'withdrawn'
    and exists (
      select 1 from collective_members cm
      where cm.collective_id = project_applications.collective_id and cm.user_id = auth.uid() and cm.role in ('owner', 'admin')
    )
  );

-- Trigger functions aren't meant to be called through the API (/rest/v1/rpc).
-- Triggers still fire without EXECUTE: Postgres only checks it at CREATE TRIGGER.
revoke execute on function guard_project_write(), guard_milestone_write(), validate_contract_insert(), lock_contract_when_fully_signed(), handle_new_user() from public, anon, authenticated;
