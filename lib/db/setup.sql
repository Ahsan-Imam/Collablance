-- ============================================================
-- CollabLance — FULL SETUP MIGRATION (run this once)
-- Paste the entire file into Supabase SQL editor → Run
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: pgvector extension
-- ─────────────────────────────────────────────────────────────
create extension if not exists vector;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: team_context table
-- ─────────────────────────────────────────────────────────────
create table if not exists team_context (
  id             uuid        default gen_random_uuid() primary key,
  user_id        uuid        references auth.users(id) on delete cascade not null,
  collective_id  uuid,
  project_id     uuid,
  display_name   text,
  avatar_initial text,
  section        text        not null check (section in (
    'building',
    'perspective',
    'blockers',
    'decisions',
    'goals',
    'context'
  )),
  title          text        not null,
  content        text        not null,
  tags           text[]      default '{}',
  is_pinned      boolean     default false,
  -- vector columns (Gemini text-embedding-004 = 768 dims)
  embedding      vector(768),
  embedding_text text,
  updated_at     timestamptz default now(),
  created_at     timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- STEP 3: HNSW index for fast cosine similarity search
-- ─────────────────────────────────────────────────────────────
create index if not exists team_context_embedding_idx
  on team_context
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ─────────────────────────────────────────────────────────────
-- STEP 4: updated_at trigger
-- ─────────────────────────────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger team_context_updated_at
  before update on team_context
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- STEP 5: Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table team_context enable row level security;

-- All authenticated users can read all cards (team visibility)
create policy "authenticated users can read all context"
  on team_context for select
  to authenticated
  using (true);

-- Users can only insert their own cards
create policy "users insert own context"
  on team_context for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can only update their own cards
create policy "users update own context"
  on team_context for update
  to authenticated
  using (auth.uid() = user_id);

-- Users can only delete their own cards
create policy "users delete own context"
  on team_context for delete
  to authenticated
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- STEP 6: Enable Supabase Realtime
-- ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table team_context;

-- ─────────────────────────────────────────────────────────────
-- STEP 7: Semantic search RPC function
-- ─────────────────────────────────────────────────────────────
create or replace function search_team_context(
  query_embedding  vector(768),
  match_threshold  float   default 0.30,
  match_count      int     default 10
)
returns table (
  id             uuid,
  user_id        uuid,
  display_name   text,
  avatar_initial text,
  section        text,
  title          text,
  content        text,
  tags           text[],
  is_pinned      boolean,
  collective_id  uuid,
  project_id     uuid,
  updated_at     timestamptz,
  created_at     timestamptz,
  similarity     float
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

grant execute on function search_team_context to authenticated;

-- ─────────────────────────────────────────────────────────────
-- STEP 8: Helper view — cards missing embeddings
-- ─────────────────────────────────────────────────────────────
create or replace view team_context_needs_embedding as
  select id, title, section, display_name, updated_at
  from team_context
  where embedding is null
  order by created_at desc;
