import 'server-only'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { chatModel } from './model'
import { searchContextCards, indexContextCards, CARD_COLUMNS } from './contextSearch'
import { getContextEligibility } from '@/lib/contextEligibility'
import { escapeLike } from '@/lib/search'

/**
 * The CollabLance AI Assistant: a LangGraph agent with three tools. Every tool
 * reads and writes through the caller's own Supabase client, so the assistant
 * can never see or do more than the signed-in user can.
 * Returns null when no AI model is configured.
 */
export function buildAssistant({ supabase, user }) {
  const llm = chatModel()
  if (!llm) return null
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member'

  const searchTeamContext = tool(
    async ({ query, limit }) => searchContextCards(supabase, query, { limit: limit ?? 8 }),
    {
      name: 'searchTeamContext',
      description: 'Semantic search over the CollabLance Team Context board — what teammates are building, their goals, blockers, decisions, and notes. Use this to answer questions about what the team is doing before answering from general knowledge.',
      schema: z.object({
        query: z.string().describe('Natural-language question or topic to search for'),
        limit: z.number().int().min(1).max(20).optional().describe('Max results, default 8'),
      }),
    },
  )

  const postTeamContext = tool(
    async ({ section, title, content, tags, teamName, projectTitle }) => {
      const elig = await getContextEligibility(supabase, user.id)
      if (elig.error) return { error: elig.error }
      if (!elig.eligible) {
        return { error: 'Not eligible to share context yet: the user needs to create or join a team and that team needs at least one started project. Suggest /teams/create and /projects/create.' }
      }

      let collective = elig.collectives[0]
      if (teamName) collective = elig.collectives.find((c) => c.name.toLowerCase().includes(teamName.toLowerCase())) || collective

      const candidates = elig.projects.filter((p) => p.collective_id === collective.id)
      if (!candidates.length) return { error: `Team "${collective.name}" has no started project yet — start a project for that team before sharing context.` }
      let project = candidates[0]
      if (projectTitle) project = candidates.find((p) => p.title.toLowerCase().includes(projectTitle.toLowerCase())) || project

      const { data, error } = await supabase
        .from('team_context')
        .insert({
          user_id: user.id,
          display_name: displayName,
          avatar_initial: displayName[0]?.toUpperCase() || 'M',
          section, title, content,
          tags: tags || [],
          collective_id: collective.id,
          project_id: project.id,
        })
        .select(CARD_COLUMNS)
        .single()
      if (error) return { error: error.message }
      await indexContextCards([data])
      return { posted: true, card: data, team: collective.name, project: project.title }
    },
    {
      name: 'postTeamContext',
      description: "Post a new card to the CollabLance Team Context board on the user's behalf — e.g. to record what they're building, a decision just made, a blocker, or a goal from this conversation. Only call this when the user clearly wants to share something with the team, not for every message. If it returns an error saying they aren't eligible, tell them to create/join a team and start a project first instead of retrying.",
      schema: z.object({
        section: z.enum(['building', 'perspective', 'blockers', 'decisions', 'goals', 'context']),
        title: z.string().describe('Short title for the card'),
        content: z.string().describe('The content to share'),
        tags: z.array(z.string()).optional(),
        teamName: z.string().optional().describe('Name of the team to post under, if the user belongs to more than one'),
        projectTitle: z.string().optional().describe('Title of the project to scope this to, if the team has more than one started project'),
      }),
    },
  )

  const listProjects = tool(
    async ({ search, status, limit }) => {
      let query = supabase
        .from('projects')
        .select('id,title,description,status,budget_min,budget_max,currency,skills_needed,deadline,created_at')
        .order('created_at', { ascending: false })
        .limit(limit ?? 8)
      if (status) query = query.eq('status', status)
      if (search) query = query.ilike('title', `%${escapeLike(search)}%`)
      const { data, error } = await query
      if (error) return { error: error.message }
      return { projects: data ?? [] }
    },
    {
      name: 'listProjects',
      description: 'Look up open or recent CollabLance projects, optionally filtered by a search term or status.',
      schema: z.object({
        search: z.string().optional().describe('Filter by title'),
        status: z.string().optional().describe('e.g. open, in_progress, completed'),
        limit: z.number().int().min(1).max(20).optional(),
      }),
    },
  )

  return createReactAgent({
    llm,
    tools: [searchTeamContext, postTeamContext, listProjects],
    prompt: `You are the CollabLance AI Assistant, embedded in the CollabLance freelancer/client collaboration platform.
You are chatting with ${displayName}.

You have tools to:
- searchTeamContext: search what the team has shared on the Team Context board (building, goals, blockers, decisions, notes)
- postTeamContext: post a new card to that board on the user's behalf, when they clearly want to record or share something
- listProjects: look up projects on the platform

Use searchTeamContext when the user asks what the team is doing, has done, or is blocked on. Use postTeamContext only when the user is clearly sharing something worth recording (a decision, a blocker, a goal, progress) — confirm briefly what you posted. Context sharing only works once the user belongs to a team with a started project; if postTeamContext errors for that reason, tell them to create/join a team and start a project first. Keep replies concise and practical.`,
  })
}
