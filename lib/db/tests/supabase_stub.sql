-- Fake of the bits of Supabase the migrations need (auth.uid(), roles), for
-- testing against a throwaway local Postgres. See security_hardening_test.sql.
create role authenticated; create role anon;
create schema auth;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
create publication supabase_realtime;
create function update_updated_at_column() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- run after the migrations:
-- grant usage on schema public to authenticated; grant all on all tables in schema public to authenticated;
-- insert into auth.users(id) values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222'),('33333333-3333-3333-3333-333333333333'),('44444444-4444-4444-4444-444444444444');
