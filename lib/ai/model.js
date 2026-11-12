import 'server-only'
import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

/**
 * The LangChain chat model every AI feature uses.
 *  - AI_GATEWAY_API_KEY set → Claude through Vercel AI Gateway (needs a card
 *    on file with Vercel).
 *  - otherwise → Gemini with the same GEMINI_API_KEY the embeddings use.
 * Returns null when neither key is set, so callers can say "AI isn't set up".
 */
export function chatModel(options = {}) {
  if (process.env.AI_GATEWAY_API_KEY) {
    return new ChatOpenAI({
      model: 'anthropic/claude-sonnet-5.5',
      apiKey: process.env.AI_GATEWAY_API_KEY,
      configuration: { baseURL: 'https://ai-gateway.vercel.sh/v1' },
      maxRetries: 1,
      ...options,
    })
  }
  if (process.env.GEMINI_API_KEY) {
    // Override with AI_MODEL if Google retires this one. maxRetries: 1 so an overloaded model fails fast instead of hanging the request.
    return new ChatGoogleGenerativeAI({ model: process.env.AI_MODEL || 'gemini-3.5-flash', apiKey: process.env.GEMINI_API_KEY, maxRetries: 1, ...options })
  }
  return null
}

export const AI_NOT_CONFIGURED = 'AI features aren’t set up on this server yet.'
