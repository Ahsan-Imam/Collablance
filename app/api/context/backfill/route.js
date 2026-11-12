import { createClient } from '@/lib/supabase/server'
import { indexContextCards, CARD_COLUMNS } from '@/lib/ai/contextSearch'
import { vectorsEnabled } from '@/lib/ai/vectors'
import { NextResponse } from 'next/server'

/**
 * POST /api/context/backfill — (re)index the caller's own cards for semantic
 * search. Needed once after connecting Chroma, for cards written before it.
 * Safe to call again: it replaces, never duplicates.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!vectorsEnabled()) return NextResponse.json({ error: 'Semantic search isn’t set up on this server yet.' }, { status: 503 })

  const { data: cards, error } = await supabase.from('team_context').select(CARD_COLUMNS).eq('user_id', user.id).limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let processed = 0
  for (let i = 0; i < cards.length; i += 50) {
    const batch = cards.slice(i, i + 50)
    if (await indexContextCards(batch)) processed += batch.length
  }
  return NextResponse.json({ processed, errors: cards.length - processed })
}
