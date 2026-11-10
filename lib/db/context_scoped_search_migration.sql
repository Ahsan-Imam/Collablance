-- Adds an optional project filter to search_team_context() so a project
-- workspace's semantic search only returns that project's cards.
-- Run this in your Supabase SQL editor AFTER vector_migration.sql.

drop function if exists search_team_context(vector(768), float, int);

create or replace function search_team_context(
  query_embedding   vector(768),
  match_threshold    float   default 0.30,
  match_count        int     default 10,
  filter_project_id  uuid    default null
)
returns table (
  id            uuid,
  user_id       uuid,
  display_name  text,
  avatar_initial text,
  section       text,
  title         text,
  content       text,
  tags          text[],
  is_pinned     boolean,
  collective_id uuid,
  project_id    uuid,
  updated_at    timestamptz,
  created_at    timestamptz,
  similarity    float
)
language plpgsql
as $$
begin
  return query
  select
    tc.id,
    tc.user_id,
    tc.display_name,
    tc.avatar_initial,
    tc.section,
    tc.title,
    tc.content,
    tc.tags,
    tc.is_pinned,
    tc.collective_id,
    tc.project_id,
    tc.updated_at,
    tc.created_at,
    1 - (tc.embedding <=> query_embedding) as similarity
  from team_context tc
  where
    tc.embedding is not null
    and 1 - (tc.embedding <=> query_embedding) > match_threshold
    and (filter_project_id is null or tc.project_id = filter_project_id)
  order by tc.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function search_team_context to authenticated;
