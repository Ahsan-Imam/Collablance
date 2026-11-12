import 'server-only'
import { searchVectors, upsertVectors, deleteVectors } from './vectors'
import { sanitizeForOrFilter } from '@/lib/search'

const COLLECTION = 'team_context'
export const CARD_COLUMNS = 'id,user_id,display_name,avatar_initial,section,title,content,tags,is_pinned,collective_id,project_id,updated_at,created_at'

// One string per card, so search matches across section, author, title, body and tags
const cardText = (c) => [
  `section: ${c.section}`,
  `author: ${c.display_name || 'unknown'}`,
  `title: ${c.title}`,
  c.content,
  c.tags?.length ? `tags: ${c.tags.join(', ')}` : '',
].filter(Boolean).join('\n')

export const indexContextCards = (cards) => upsertVectors(COLLECTION, cards.map((c) => ({
  id: c.id, text: cardText(c), metadata: { project_id: c.project_id || '' },
})))

export const unindexContextCard = (id) => deleteVectors(COLLECTION, [id])

/**
 * Semantic search over the Team Context board. Chroma ranks the cards; the
 * rows are then read from Supabase as the user, so row level security decides
 * what comes back. Falls back to keyword search when vectors are off, fail,
 * or find nothing (e.g. cards not indexed yet).
 */
export async function searchContextCards(supabase, query, { limit = 12, projectId, threshold = 0.55 } = {}) {
  const hits = await searchVectors(COLLECTION, query, {
    limit: limit * 3, // spare results, in case the user can't read some
    where: projectId ? { project_id: projectId } : undefined,
  })
  const good = (hits || []).filter((h) => h.similarity >= threshold)
  if (good.length) {
    const { data, error } = await supabase.from('team_context').select(CARD_COLUMNS).in('id', good.map((h) => h.id))
    if (!error && data.length) {
      const byId = Object.fromEntries(data.map((c) => [c.id, c]))
      const results = good.filter((h) => byId[h.id]).map((h) => ({ ...byId[h.id], similarity: h.similarity })).slice(0, limit)
      return { mode: 'vector', results }
    }
  }

  const safe = sanitizeForOrFilter(query)
  if (!safe) return { mode: 'text', results: [] }
  let fallback = supabase
    .from('team_context')
    .select(CARD_COLUMNS)
    .or(`title.ilike.%${safe}%,content.ilike.%${safe}%`)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (projectId) fallback = fallback.eq('project_id', projectId)
  const { data, error } = await fallback
  return { mode: 'text', results: data ?? [], error: error?.message }
}
