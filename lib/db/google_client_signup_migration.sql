-- ============================================================
-- CollabLance — Google sign-up for clients
-- Run AFTER client_role_migration.sql. Safe to re-run.
--
-- Google OAuth can't carry the Client/Freelancer choice into the new
-- account, so every Google sign-up starts as a freelancer. The OAuth
-- callback then calls claim_client_role() when the user picked Client.
-- The role stays locked for everyone else.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Lock by database role instead of JWT claim
--    API requests run as `authenticated` / `anon` and stay locked.
--    SECURITY DEFINER functions (handle_new_user, claim_client_role)
--    run as their owner, so they can set the role.
-- ─────────────────────────────────────────────────────────────
create or replace function lock_profile_role()
returns trigger as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.role := 'freelancer';
    else
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

-- ─────────────────────────────────────────────────────────────
-- 2. claim_client_role()
--    Makes the caller a client only if the account is brand new:
--    created in the last 15 minutes and not in any collective yet.
--    Returns the caller's role afterwards ('client' or 'freelancer').
-- ─────────────────────────────────────────────────────────────
create or replace function claim_client_role()
returns text as $$
declare
  uid        uuid := auth.uid();
  created    timestamptz;
  cur_role   text;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  select u.created_at into created from auth.users u where u.id = uid;
  select p.role into cur_role from profiles p where p.id = uid;

  if cur_role = 'client' then
    return 'client';
  end if;

  if created < now() - interval '15 minutes'
     or exists (select 1 from collective_members where user_id = uid) then
    return coalesce(cur_role, 'freelancer');
  end if;

  update profiles set role = 'client' where id = uid;
  return 'client';
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function claim_client_role() from public, anon;
grant execute on function claim_client_role() to authenticated;

notify pgrst, 'reload schema';
