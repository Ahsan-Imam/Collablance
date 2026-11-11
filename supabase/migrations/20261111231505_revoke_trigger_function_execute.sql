-- Trigger functions aren't meant to be called through the API (/rest/v1/rpc).
-- Triggers still fire without EXECUTE: Postgres only checks it at CREATE TRIGGER.
revoke execute on function guard_project_write(), guard_milestone_write(), validate_contract_insert(), lock_contract_when_fully_signed(), handle_new_user() from public, anon, authenticated;
