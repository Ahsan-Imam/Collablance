import { createClient } from '@/lib/supabase/server'
import { generateQueryEmbedding } from '@/lib/embeddings'
import { NextResponse } from 'next/server'

/**
 * POST /api/context/search
 * Body: { query: string, threshold?: number (0–1), limit?: number }
 *
 * Uses pgvector cosine similarity via the search_team_context() SQL function.
 * Falls back to full-text ilike search if embedding is unavailable.
 */
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { query, threshold = 0.30, limit = 12 } = body

  if (!query?.trim()) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  // Try vector search first
  const queryEmbedding = await generateQueryEmbedding(query)

  if (queryEmbedding) {
    const { data, error } = await supabase.rpc('search_team_context', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    })

    if (error) {
      console.error('[search] pgvector error:', error.message)
      // Fall through to text search
    } else {
      return NextResponse.json({ data, mode: 'vector', query })
    }
  }

  // Fallback: full-text keyword search across title + content
  const q = `%${query.trim()}%`
  const { data, error } = await supabase
    .from('team_context')
    .select('id,user_id,display_name,avatar_initial,section,title,content,tags,is_pinned,collective_id,project_id,updated_at,created_at')
    .or(`title.ilike.${q},content.ilike.${q}`)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, mode: 'text', query })
}
