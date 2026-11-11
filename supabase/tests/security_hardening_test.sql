-- Attack tests for the access rules (RLS + triggers). NEVER run on the real database.
-- Needs a throwaway local Postgres 17 + pgvector (brew install postgresql@17 pgvector):
--   1. run supabase_stub.sql (fake auth schema/roles)
--   2. run every supabase/migrations/*.sql in filename order
--   3. run the grants + test users from the bottom of supabase_stub.sql
--   4. psql -f this file — each step echoes what to expect
\set C '''11111111-1111-1111-1111-111111111111'''
\set L '''22222222-2222-2222-2222-222222222222'''
\set M '''33333333-3333-3333-3333-333333333333'''
\set X '''44444444-4444-4444-4444-444444444444'''
-- setup as superuser (no auth.uid -> triggers allow)
insert into collectives(id, owner_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', :L, 'Team');
insert into collective_members(collective_id, user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000001', :L, 'owner'), ('aaaaaaaa-0000-0000-0000-000000000001', :M, 'member');
insert into projects(id, owner_id, title, description, collective_id) values ('bbbbbbbb-0000-0000-0000-000000000001', :C, 'P', 'd', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into milestones(id, project_id, title, amount) values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'm1', 1000);

set role authenticated;
\echo '== 1. stranger joins team as owner (expect ERROR)'
select set_config('request.jwt.claim.sub', :X, false) \g /dev/null
insert into collective_members(collective_id, user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000001', :X, 'owner');
\echo '== 1b. stranger joins as member (expect INSERT 0 1 - share-link join still works)'
insert into collective_members(collective_id, user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000001', :X, 'member');
reset role; delete from collective_members where user_id = :X; set role authenticated;

\echo '== 2. team member approves own milestone (expect ERROR)'
select set_config('request.jwt.claim.sub', :M, false) \g /dev/null
update milestones set status = 'approved' where id = 'cccccccc-0000-0000-0000-000000000001';
\echo '== 2b. team member changes amount (expect ERROR)'
update milestones set amount = 999999 where id = 'cccccccc-0000-0000-0000-000000000001';
\echo '== 2c. team member submits (expect UPDATE 1)'
update milestones set status = 'submitted', submitted_at = now() where id = 'cccccccc-0000-0000-0000-000000000001';
\echo '== 2d. client marks paid (expect ERROR)'
select set_config('request.jwt.claim.sub', :C, false) \g /dev/null
update milestones set status = 'paid' where id = 'cccccccc-0000-0000-0000-000000000001';
\echo '== 2e. client inserts milestone as already paid (expect status=pending)'
insert into milestones(project_id, title, amount, status) values ('bbbbbbbb-0000-0000-0000-000000000001', 'm2', 5, 'paid') returning status;
\echo '== 2f. client approves (expect UPDATE 1)'
update milestones set status = 'approved', approved_at = now(), approved_by = :C where id = 'cccccccc-0000-0000-0000-000000000001';

\echo '== 3. lead proposes bad split 90/20 (expect ERROR)'
select set_config('request.jwt.claim.sub', :L, false) \g /dev/null
insert into project_contracts(project_id, collective_id, created_by, splits) values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', :L, '[{"user_id":"22222222-2222-2222-2222-222222222222","percent":90},{"user_id":"33333333-3333-3333-3333-333333333333","percent":20}]');
\echo '== 3b. lead leaves member out (expect ERROR)'
insert into project_contracts(project_id, collective_id, created_by, splits) values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', :L, '[{"user_id":"22222222-2222-2222-2222-222222222222","percent":100}]');
\echo '== 3c. lead inserts pre-signed 70/30 (expect status=pending)'
insert into project_contracts(id, project_id, collective_id, created_by, splits, status) values ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', :L, '[{"user_id":"22222222-2222-2222-2222-222222222222","percent":70},{"user_id":"33333333-3333-3333-3333-333333333333","percent":30}]', 'signed') returning status;
\echo '== 4. lead accepts before signatures (expect ERROR)'
update projects set accepted_at = now(), accepted_by = :L, status = 'in_progress' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
\echo '== 4b. lead signs, then member rewrites split to 1/99 (expect UPDATE 0)'
insert into contract_signatures(contract_id, user_id) values ('dddddddd-0000-0000-0000-000000000001', :L);
select set_config('request.jwt.claim.sub', :M, false) \g /dev/null
update project_contracts set splits = '[{"user_id":"22222222-2222-2222-2222-222222222222","percent":1},{"user_id":"33333333-3333-3333-3333-333333333333","percent":99}]';
\echo '== 4c. member signs -> contract auto-locks (expect signed)'
insert into contract_signatures(contract_id, user_id) values ('dddddddd-0000-0000-0000-000000000001', :M);
select status, locked_at is not null as locked from project_contracts;

\echo '== 5. lead steals project ownership (expect ERROR)'
select set_config('request.jwt.claim.sub', :L, false) \g /dev/null
update projects set owner_id = :L where id = 'bbbbbbbb-0000-0000-0000-000000000001';
\echo '== 5b. lead raises budget (expect ERROR)'
update projects set budget_max = 9999999 where id = 'bbbbbbbb-0000-0000-0000-000000000001';
\echo '== 5c. lead accepts now that split is signed (expect UPDATE 1)'
update projects set accepted_at = now(), accepted_by = :L, status = 'in_progress' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
\echo '== 5d. client reassigns accepted project to another team (expect ERROR)'
select set_config('request.jwt.claim.sub', :C, false) \g /dev/null
update projects set collective_id = null where id = 'bbbbbbbb-0000-0000-0000-000000000001';
\echo '== 5e. client deletes accepted project (expect DELETE 0)'
delete from projects where id = 'bbbbbbbb-0000-0000-0000-000000000001';

\echo '== 6. stranger posts fake 5-star review (expect ERROR)'
reset role; update projects set status = 'completed' where id = 'bbbbbbbb-0000-0000-0000-000000000001'; set role authenticated;
select set_config('request.jwt.claim.sub', :X, false) \g /dev/null
insert into reviews(project_id, reviewer_id, direction, collective_id, rating) values ('bbbbbbbb-0000-0000-0000-000000000001', :X, 'client_to_team', 'aaaaaaaa-0000-0000-0000-000000000001', 5);
\echo '== 6b. real client reviews team (expect INSERT 0 1)'
select set_config('request.jwt.claim.sub', :C, false) \g /dev/null
insert into reviews(project_id, reviewer_id, direction, collective_id, rating) values ('bbbbbbbb-0000-0000-0000-000000000001', :C, 'client_to_team', 'aaaaaaaa-0000-0000-0000-000000000001', 5);

\echo '== 7. lead accepts own application (expect ERROR)'
reset role;
insert into projects(id, owner_id, title, description) values ('bbbbbbbb-0000-0000-0000-000000000002', :C, 'P2', 'd');
insert into project_applications(id, project_id, collective_id, applied_by) values ('eeeeeeee-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', :L);
set role authenticated;
select set_config('request.jwt.claim.sub', :L, false) \g /dev/null
update project_applications set status = 'accepted' where id = 'eeeeeeee-0000-0000-0000-000000000001';
\echo '== 7b. lead withdraws (expect UPDATE 1)'
update project_applications set status = 'withdrawn' where id = 'eeeeeeee-0000-0000-0000-000000000001';

-- Client role: posting needs client access, granted only through add_role()
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false) \g /dev/null
\echo '== R1. freelancer posts project (expect ERROR - needs client access)'
insert into projects(owner_id, title, description) values ('44444444-4444-4444-4444-444444444444', 'x', 'y');
\echo '== R2. freelancer makes self client by editing profile directly (expect is_client=f, trigger reverts it)'
update profiles set is_client = true, role = 'client' where id = '44444444-4444-4444-4444-444444444444';
select is_client, role from profiles where id = '44444444-4444-4444-4444-444444444444';
\echo '== R3. "Become a client" via add_role (expect client)'
select add_role('client');
\echo '== R4. now posts project (expect status=open)'
insert into projects(owner_id, title, description, status) values ('44444444-4444-4444-4444-444444444444', 'x', 'y', 'completed') returning status;
\echo '== R5. switch back to freelancer mode (expect freelancer)'
select switch_role('freelancer');
