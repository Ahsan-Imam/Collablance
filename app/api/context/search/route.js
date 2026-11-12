import { createClient } from '@/lib/supabase/server'
import { searchContextCards } from '@/lib/ai/contextSearch'
import { NextResponse } from 'next/server'

/**
 * POST /api/context/search
 * Body: { query: string, threshold?: number (0–1), limit?: number, project_id?: string }
 * Semantic search (Chroma), falling back to keyword search.
 */
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query, threshold, limit, project_id: projectId } = await request.json()
  if (!query?.trim()) return NextResponse.json({ error: 'query is required' }, { status: 400 })

  const { mode, results, error } = await searchContextCards(supabase, query, {
    limit: Math.min(Number(limit) || 12, 50), projectId, threshold,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: results, mode, query })
}
