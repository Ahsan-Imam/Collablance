/**
 * lib/embeddings.js
 *
 * Generates embeddings via the Google Gemini Embeddings API.
 * Model: text-embedding-004 (768 dimensions)
 * Docs: https://ai.google.dev/gemini-api/docs/embeddings
 *
 * Falls back gracefully when GEMINI_API_KEY is not set — cards still save.
 */

const MODEL         = 'text-embedding-004'
const GEMINI_API    = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`
export const EMBED_DIMS = 768  // exported so SQL migration can reference this

/**
 * Build a single string to embed for a context card.
 * Combines section label, title, content, tags and author
 * so semantic search works across all fields.
 */
export function buildEmbeddingText({ section, title, content, tags, display_name }) {
  const parts = [
    `section: ${section}`,
    `author: ${display_name || 'unknown'}`,
    `title: ${title}`,
    content,
  ]
  if (tags?.length) parts.push(`tags: ${tags.join(', ')}`)
  // Gemini supports up to 2048 tokens; ~8000 chars is a safe char limit
  return parts.join('\n').slice(0, 8000)
}

/**
 * Generate an embedding vector for the given text using Gemini.
 * Returns null (does NOT throw) when the API key is absent or the call fails.
 *
 * @param {string} text
 * @returns {Promise<number[] | null>}
 */
export async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('[embeddings] GEMINI_API_KEY not set — skipping embedding')
    return null
  }

  try {
    const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${MODEL}`,
        content: {
          parts: [{ text }],
        },
        // taskType helps Gemini optimise the embedding direction:
        //   RETRIEVAL_DOCUMENT for stored content,
        //   RETRIEVAL_QUERY    for search queries (set in generateQueryEmbedding)
        taskType: 'RETRIEVAL_DOCUMENT',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[embeddings] Gemini error:', res.status, err)
      return null
    }

    const json = await res.json()
    return json.embedding?.values ?? null
  } catch (err) {
    console.error('[embeddings] fetch error:', err.message)
    return null
  }
}

/**
 * Generate an embedding for a search query string.
 * Uses RETRIEVAL_QUERY task type for better query-vs-document matching.
 *
 * @param {string} query
 * @returns {Promise<number[] | null>}
 */
export async function generateQueryEmbedding(query) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${MODEL}`,
        content: {
          parts: [{ text: query.slice(0, 2000) }],
        },
        taskType: 'RETRIEVAL_QUERY',
      }),
    })

    if (!res.ok) {
      console.error('[embeddings] Gemini query error:', res.status)
      return null
    }

    const json = await res.json()
    return json.embedding?.values ?? null
  } catch (err) {
    console.error('[embeddings] query fetch error:', err.message)
    return null
  }
}
