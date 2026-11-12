import { createClient } from '@/lib/supabase/server'
import { buildAssistant } from '@/lib/ai/assistant'
import { AI_NOT_CONFIGURED } from '@/lib/ai/model'
import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain'
import { createUIMessageStreamResponse } from 'ai'

export const maxDuration = 60

// POST /api/chat — the AI Assistant (LangGraph agent), streamed to useChat
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const assistant = buildAssistant({ supabase, user })
  if (!assistant) return new Response(AI_NOT_CONFIGURED, { status: 503 })

  const { messages } = await request.json()
  const stream = await assistant.stream(
    { messages: await toBaseMessages(messages) },
    // recursionLimit caps the model ↔ tool loop (about 5 tool rounds)
    { streamMode: ['values', 'messages'], recursionLimit: 12 },
  )
  return createUIMessageStreamResponse({ stream: toUIMessageStream(stream) })
}
