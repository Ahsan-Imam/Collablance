import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, buildEmbeddingText } from '@/lib/embeddings'
import { NextResponse } from 'next/server'

/**
 * POST /api/context/backfill
 * Re-generates embeddings for all cards that don't have one yet.
 * Admin/owner-only: only processes cards owned by the calling user.
 * Batch size: 10 cards per call to avoid timeouts.
 *
 * Returns: { processed, skipped, errors }
 */
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch up to 10 cards without embeddings belonging to this user
  const { data: cards, error: fetchErr } = await supabase
    .from('team_context')
    .select('*')
    .eq('user_id', user.id)
    .is('embedding', null)
    .limit(10)

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!cards || cards.length === 0) {
    return NextResponse.json({ processed: 0, skipped: 0, errors: 0, message: 'All your cards already have embeddings ✅' })
  }

  let processed = 0, skipped = 0, errors = 0

  for (const card of cards) {
    try {
      const embeddingText = buildEmbeddingText(card)
      const embedding = await generateEmbedding(embeddingText)

      if (!embedding) {
        skipped++
        continue
      }

      const { error: updateErr } = await supabase
        .from('team_context')
        .update({ embedding, embedding_text: embeddingText })
        .eq('id', card.id)

      if (updateErr) {
        errors++
        console.error('[backfill] update error:', updateErr.message)
      } else {
        processed++
      }
    } catch (err) {
      errors++
      console.error('[backfill] card error:', err.message)
    }
  }

  return NextResponse.json({
    processed,
    skipped,
    errors,
    remaining: cards.length === 10 ? 'more cards remaining — call again' : 'done',
  })
}
