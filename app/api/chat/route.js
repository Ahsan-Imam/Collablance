import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, generateQueryEmbedding, buildEmbeddingText } from '@/lib/embeddings'
import { sanitizeForOrFilter, escapeLike } from '@/lib/search'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  tool,
  isStepCount,
} from 'ai'
import { z } from 'zod'

export const maxDuration = 60

const MODEL = 'anthropic/claude-sonnet-5.5'

const CARD_COLUMNS = 'id,user_id,display_name,avatar_initial,section,title,content,tags,is_pinned,updated_at,created_at'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member'

  const { messages } = await request.json()

  const tools = {
    searchTeamContext: tool({
      description:
        "Semantic search over the CollabLance Team Context board — what teammates are building, their goals, blockers, decisions, and notes. Use this to answer questions about what the team is doing before answering from general knowledge.",
      inputSchema: z.object({
        query: z.string().describe('Natural-language question or topic to search for'),
        limit: z.number().int().min(1).max(20).optional().describe('Max results, default 8'),
      }),
      execute: async ({ query, limit = 8 }) => {
        const queryEmbedding = await generateQueryEmbedding(query)

        if (queryEmbedding) {
          const { data, error } = await supabase.rpc('search_team_context', {
            query_embedding: queryEmbedding,
            match_threshold: 0.3,
            match_count: limit,
          })
          if (!error) return { mode: 'vector', results: data ?? [] }
        }

        const safe = sanitizeForOrFilter(query)
        if (!safe) return { mode: 'text', results: [] }
        const q = `%${safe}%`
        const { data, error } = await supabase
          .from('team_context')
          .select(CARD_COLUMNS)
          .or(`title.ilike.${q},content.ilike.${q}`)
          .order('updated_at', { ascending: false })
          .limit(limit)
        if (error) return { mode: 'text', results: [], error: error.message }
        return { mode: 'text', results: data ?? [] }
      },
    }),

    postTeamContext: tool({
      description:
        "Post a new card to the CollabLance Team Context board on the user's behalf — e.g. to record what they're building, a decision just made, a blocker, or a goal from this conversation. Only call this when the user clearly wants to share something with the team, not for every message.",
      inputSchema: z.object({
        section: z.enum(['building', 'perspective', 'blockers', 'decisions', 'goals', 'context']),
        title: z.string().describe('Short title for the card'),
        content: z.string().describe('The content to share'),
        tags: z.array(z.string()).optional(),
      }),
      execute: async ({ section, title, content, tags }) => {
        const avatarInitial = displayName[0]?.toUpperCase() || 'M'
        const embeddingText = buildEmbeddingText({ section, title, content, tags, display_name: displayName })
        const embedding = await generateEmbedding(embeddingText)

        const { data, error } = await supabase
          .from('team_context')
          .insert({
            user_id: user.id,
            display_name: displayName,
            avatar_initial: avatarInitial,
            section,
            title,
            content,
            tags: tags || [],
            embedding: embedding ?? null,
            embedding_text: embedding ? embeddingText : null,
          })
          .select(CARD_COLUMNS)
          .single()

        if (error) return { error: error.message }
        return { posted: true, card: data }
      },
    }),

    listProjects: tool({
      description: 'Look up open or recent CollabLance projects, optionally filtered by a search term or status.',
      inputSchema: z.object({
        search: z.string().optional().describe('Filter by title'),
        status: z.string().optional().describe('e.g. open, in_progress, completed'),
        limit: z.number().int().min(1).max(20).optional(),
      }),
      execute: async ({ search, status, limit = 8 }) => {
        let query = supabase
          .from('projects')
          .select('id,title,description,status,budget_min,budget_max,currency,skills_needed,deadline,created_at')
          .order('created_at', { ascending: false })
          .limit(limit)
        if (status) query = query.eq('status', status)
        if (search) query = query.ilike('title', `%${escapeLike(search)}%`)
        const { data, error } = await query
        if (error) return { error: error.message }
        return { projects: data ?? [] }
      },
    }),
  }

  const result = streamText({
    model: MODEL,
    system: `You are the CollabLance AI Assistant, embedded in the CollabLance freelancer/client collaboration platform.
You are chatting with ${displayName}.

You have tools to:
- searchTeamContext: search what the team has shared on the Team Context board (building, goals, blockers, decisions, notes)
- postTeamContext: post a new card to that board on the user's behalf, when they clearly want to record or share something
- listProjects: look up projects on the platform

Use searchTeamContext when the user asks what the team is doing, has done, or is blocked on. Use postTeamContext only when the user is clearly sharing something worth recording (a decision, a blocker, a goal, progress) — confirm briefly what you posted. Keep replies concise and practical.`,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(5),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
