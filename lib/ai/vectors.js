import 'server-only'
import { ChromaClient, CloudClient } from 'chromadb'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'

/**
 * lib/ai/vectors.js — the one place that talks to Chroma. Embeddings come from
 * Gemini through LangChain. Chroma holds only ids, vectors and a little
 * metadata; the rows themselves stay in Supabase, and callers re-read them
 * there so row level security still decides who sees what.
 *
 * Off until GEMINI_API_KEY and a Chroma server are configured. Every function
 * then returns null / does nothing, and callers fall back to plain matching.
 * Nothing here throws: a vector-store outage must not fail a request.
 */

const EMBED_MODEL = 'gemini-embedding-001'
const DIMS = 768

export function vectorsEnabled() {
  return !!process.env.GEMINI_API_KEY && !!(process.env.CHROMA_API_KEY || process.env.CHROMA_URL)
}

function chroma() {
  if (process.env.CHROMA_API_KEY) {
    // Chroma Cloud
    return new CloudClient({ apiKey: process.env.CHROMA_API_KEY, tenant: process.env.CHROMA_TENANT, database: process.env.CHROMA_DATABASE })
  }
  // Self-hosted, e.g. CHROMA_URL=http://localhost:8000
  const url = new URL(process.env.CHROMA_URL)
  return new ChromaClient({ host: url.hostname, port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80), ssl: url.protocol === 'https:' })
}

// embeddingFunction: null → we always send our own vectors
const collection = (name) => chroma().getOrCreateCollection({ name, embeddingFunction: null })

const embedder = (taskType) => new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY, model: EMBED_MODEL, taskType, outputDimensionality: DIMS,
})

// Scale to length 1. Gemini's shortened vectors aren't unit length, and with
// unit vectors Chroma's default distance (squared L2) maps exactly to cosine
// similarity: similarity = 1 - distance / 2. No per-collection config needed.
function unit(vector) {
  const length = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0)) || 1
  return vector.map((x) => x / length)
}

const clip = (text) => String(text).slice(0, 8000)

/** items: [{ id, text, metadata? }] — adds or replaces them. */
export async function upsertVectors(name, items) {
  if (!vectorsEnabled() || !items.length) return false
  try {
    const embeddings = await embedder('RETRIEVAL_DOCUMENT').embedDocuments(items.map((i) => clip(i.text)))
    await (await collection(name)).upsert({
      ids: items.map((i) => i.id),
      embeddings: embeddings.map(unit),
      metadatas: items.map((i) => i.metadata || { kind: name }),
    })
    return true
  } catch (err) {
    console.error('[vectors] upsert failed:', name, err.message)
    return false
  }
}

export async function deleteVectors(name, ids) {
  if (!vectorsEnabled() || !ids.length) return
  try {
    await (await collection(name)).delete({ ids })
  } catch (err) {
    console.error('[vectors] delete failed:', name, err.message)
  }
}

/**
 * Nearest items to a piece of text, best first: [{ id, similarity }] (0–1).
 * where: Chroma metadata filter. ids: only rank these ids. Returns null when
 * vectors are off or the search failed, so the caller can fall back.
 */
export async function searchVectors(name, text, { limit = 10, where, ids } = {}) {
  if (!vectorsEnabled()) return null
  if (ids && !ids.length) return []
  try {
    const queryEmbedding = unit(await embedder('RETRIEVAL_QUERY').embedQuery(clip(text)))
    const result = await (await collection(name)).query({
      queryEmbeddings: [queryEmbedding], nResults: limit, where, ids, include: ['distances'],
    })
    return result.ids[0].map((id, i) => ({ id, similarity: 1 - result.distances[0][i] / 2 }))
  } catch (err) {
    console.error('[vectors] search failed:', name, err.message)
    return null
  }
}

/**
 * Make sure each item is in the index and current. items: [{ id, text, stamp }]
 * where stamp changes whenever the text does (e.g. the row's updated_at).
 * Only missing or stale items are embedded, so repeat calls are cheap.
 */
export async function syncVectors(name, items) {
  if (!vectorsEnabled() || !items.length) return
  try {
    const existing = await (await collection(name)).get({ ids: items.map((i) => i.id), include: ['metadatas'] })
    const stampById = Object.fromEntries(existing.ids.map((id, i) => [id, existing.metadatas[i]?.stamp]))
    const stale = items.filter((i) => stampById[i.id] !== String(i.stamp))
    await upsertVectors(name, stale.map((i) => ({ id: i.id, text: i.text, metadata: { stamp: String(i.stamp) } })))
  } catch (err) {
    console.error('[vectors] sync failed:', name, err.message)
  }
}
