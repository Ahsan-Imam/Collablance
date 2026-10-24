-- ============================================================
-- Vector DB migration for team_context
-- Embedding model: Google Gemini text-embedding-004 (768 dims)
-- Run this in your Supabase SQL editor AFTER team_context_migration.sql
--
-- If you previously ran the OpenAI (1536-dim) version, run the
-- optional ALTER statements at the bottom to migrate in-place.
-- ============================================================

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Add embedding column  — Gemini text-embedding-004 = 768 dims
alter table team_context
  add column if not exists embedding vector(768),
  add column if not exists embedding_text text;   -- text that was embedded (audit trail)

-- 3. HNSW index for fast cosine-similarity search
create index if not exists team_context_embedding_idx
  on team_context
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 4. Semantic search function (cosine similarity via <=> operator)
create or replace function search_team_context(
  query_embedding vector(768),
  match_threshold  float   default 0.30,
  match_count      int     default 10
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
  order by tc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 5. Grant execute to authenticated users
grant execute on function search_team_context to authenticated;

-- 6. Monitoring view — cards still waiting for an embedding
create or replace view team_context_needs_embedding as
  select id, title, section, display_name, updated_at
  from team_context
  where embedding is null
  order by created_at desc;

-- ============================================================
-- MIGRATION from OpenAI 1536-dim → Gemini 768-dim
-- Only run these if you previously ran the 1536-dim version.
-- They null out old embeddings so the backfill endpoint re-embeds.
-- ============================================================
-- alter table team_context alter column embedding type vector(768);
-- update team_context set embedding = null, embedding_text = null;
-- drop index if exists team_context_embedding_idx;
-- create index team_context_embedding_idx
--   on team_context using hnsw (embedding vector_cosine_ops)
--   with (m = 16, ef_construction = 64);
