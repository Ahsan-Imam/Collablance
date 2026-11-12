-- State machine guards. Run in your Supabase SQL editor BEFORE deploying the
-- matching app code: accepting an application calls accept_application().
--
-- 1. Project status: a project is 'open' exactly while no team has accepted it,
--    and only an accepted project can be 'in_progress' or 'completed'.
--    'cancelled' is always allowed. Mirrors canMoveProject() in
--    lib/projectAcceptance.js — change both together. Same function as in
--    20261111231000_security_hardening.sql plus the one status check.

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
  else
    if new.status is distinct from old.status and new.status <> 'cancelled'
       and (new.accepted_at is null) <> (new.status = 'open') then
      raise exception 'A project is open until a team accepts it, then in progress or completed';
    end if;
    if new.status = 'completed' and old.status <> 'completed' and exists (
      select 1 from milestones m where m.project_id = new.id and m.status in ('submitted', 'disputed')
    ) then
      raise exception 'Approve, return or resolve submitted/disputed milestones before completing the project';
    end if;
  end if;

  return new;
end $$;

revoke execute on function guard_project_write() from public, anon, authenticated;

-- 2. Accepting an application in one transaction: the project is claimed, the
--    application accepted and the other pending ones rejected together, or not
--    at all. Runs as the caller, so RLS and guard_project_write (signed
--    contract required) still decide who may do it.
create or replace function accept_application(p_application_id uuid)
returns project_applications language plpgsql security invoker set search_path = public as $$
declare
  app project_applications;
begin
  select * into app from project_applications
   where id = p_application_id and status = 'pending' for update;
  if not found then raise exception 'This application was already resolved'; end if;

  update projects
     set collective_id = app.collective_id, status = 'in_progress',
         accepted_at = now(), accepted_by = app.applied_by
   where id = app.project_id and status = 'open' and collective_id is null;
  if not found then raise exception 'This project is no longer open for applications'; end if;

  update project_applications set status = 'accepted', responded_at = now()
   where id = app.id returning * into app;

  update project_applications set status = 'rejected', responded_at = now()
   where project_id = app.project_id and status = 'pending' and id <> app.id;

  return app;
end $$;

revoke execute on function accept_application(uuid) from public, anon;
grant execute on function accept_application(uuid) to authenticated;

-- 3. Milestones: the client can dispute a funded milestone the team hasn't
--    submitted (pending>disputed), so escrowed money is never stuck. Mirrors
--    canMoveMilestone() in lib/milestones.js. Same function as in
--    20261112100000_payments.sql plus that one move.
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
    new.funded_at := null;
    return new;
  end if;

  if new.project_id is distinct from old.project_id then
    raise exception 'A milestone cannot move between projects';
  end if;

  if new.funded_at is distinct from old.funded_at then
    raise exception 'Only a confirmed payment can mark a milestone funded';
  end if;

  select coalesce(p.owner_id = uid, false) into is_owner from projects p where p.id = old.project_id;
  is_owner := coalesce(is_owner, false);

  if new.status is distinct from old.status then
    move := old.status || '>' || new.status;
    if not (
         (is_owner and (move in ('submitted>pending', 'submitted>approved', 'submitted>disputed', 'approved>disputed')
                       or (move = 'pending>disputed' and old.funded_at is not null)))
      or (not is_owner and move in ('pending>submitted', 'submitted>disputed', 'approved>disputed'))
    ) then
      raise exception 'Cannot move milestone from "%" to "%" with your role', old.status, new.status;
    end if;
  end if;

  if (new.title, new.description, new.amount, new.currency, new.due_date, new.order_index)
     is distinct from (old.title, old.description, old.amount, old.currency, old.due_date, old.order_index)
     and not (is_owner and old.status = 'pending' and old.funded_at is null) then
    raise exception 'Only the project owner can edit a milestone, and only before it is funded or submitted';
  end if;

  if new.approved_by is distinct from old.approved_by and new.approved_by is distinct from uid then
    raise exception 'approved_by must be you';
  end if;

  return new;
end $$;

revoke execute on function guard_milestone_write() from public, anon, authenticated;

notify pgrst, 'reload schema';
