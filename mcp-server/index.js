#!/usr/bin/env node
/**
 * CollabLance Context — MCP Server (stdio transport)
 *
 * Compatible with: Claude Desktop, Cursor, VS Code Copilot Chat,
 *                  Antigravity IDE, and any MCP-capable AI tool.
 *
 * Protocol: Model Context Protocol (MCP) over stdio (JSON-RPC 2.0)
 *
 * Tools exposed:
 *   get_team_context          — fetch all shared context cards
 *   get_context_by_section    — fetch cards for a specific section
 *   get_member_context        — fetch cards from a specific team member
 *   post_my_context           — post a new context card
 *   get_context_summary       — AI-friendly summary of the whole board
 *   semantic_search_context   — vector search via Gemini + pgvector
 *
 * Setup:
 *   export COLLABLANCE_SUPABASE_URL=https://xxx.supabase.co
 *   export COLLABLANCE_SUPABASE_ANON_KEY=eyJ...
 *   export GEMINI_API_KEY=AIza...   (for semantic search)
 *   node index.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL   = process.env.COLLABLANCE_SUPABASE_URL  || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY   = process.env.COLLABLANCE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL   = 'text-embedding-004'
const GEMINI_EMBED   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:embedContent`
const SERVER_NAME    = 'collablance-context'
const SERVER_VERSION = '1.0.0'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  process.stderr.write(
    '[collablance-mcp] ERROR: Set COLLABLANCE_SUPABASE_URL and COLLABLANCE_SUPABASE_ANON_KEY\n'
  )
}

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null

// ── Tool Definitions ────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'get_team_context',
    description: 'Fetch all shared context cards from the CollabLance team board. Returns what every team member is building, their goals, blockers, decisions, and notes. Use this to understand the full team context before coding.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max number of cards to return (default 50)',
        },
      },
    },
  },
  {
    name: 'get_context_by_section',
    description: 'Fetch context cards filtered by section type. Useful when you only need a specific type of context.',
    inputSchema: {
      type: 'object',
      required: ['section'],
      properties: {
        section: {
          type: 'string',
          enum: ['building', 'perspective', 'goals', 'decisions', 'blockers', 'context'],
          description: 'The section to filter by: building (what members are building), perspective (their views), goals, decisions, blockers, or context (general notes)',
        },
      },
    },
  },
  {
    name: 'get_member_context',
    description: 'Fetch context cards from a specific team member by their display name.',
    inputSchema: {
      type: 'object',
      required: ['member_name'],
      properties: {
        member_name: {
          type: 'string',
          description: 'The display name of the team member',
        },
      },
    },
  },
  {
    name: 'get_context_summary',
    description: 'Get an AI-friendly structured summary of the entire team context board, organized by member and section. Best used at the start of a coding session to understand what everyone is working on.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'post_my_context',
    description: 'Post a new context card to the team board on behalf of the user. Use to share what you are about to build, a decision you just made, or a blocker you hit.',
    inputSchema: {
      type: 'object',
      required: ['section', 'title', 'content', 'user_id', 'display_name'],
      properties: {
        section: {
          type: 'string',
          enum: ['building', 'perspective', 'goals', 'decisions', 'blockers', 'context'],
        },
        title: { type: 'string', description: 'Short title for the context card' },
        content: { type: 'string', description: 'Detailed content' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tag list' },
        user_id: { type: 'string', description: 'The Supabase user UUID of the poster' },
        display_name: { type: 'string', description: 'The display name to show on the card' },
      },
    },
  },
  {
    name: 'semantic_search_context',
    description: 'Semantic vector search across all team context cards using pgvector cosine similarity. Much more powerful than keyword search — understands meaning, not just exact words. Use this when get_team_context is too broad and you want cards most relevant to a specific topic or question.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          description: 'A natural language question or topic, e.g. "what is the team building for payments" or "React performance issues"',
        },
        threshold: {
          type: 'number',
          description: 'Minimum cosine similarity score (0–1). Default 0.30. Higher = stricter match.',
        },
        limit: {
          type: 'number',
          description: 'Max results to return. Default 8.',
        },
      },
    },
  },
]

// ── DB helpers ──────────────────────────────────────────────────────────────
async function dbQuery(query) {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } }
  return query
}

async function getAllCards(limit = 50) {
  const { data, error } = await dbQuery(
    supabase
      .from('team_context')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit)
  )
  return { data, error }
}

async function getBySection(section) {
  const { data, error } = await dbQuery(
    supabase
      .from('team_context')
      .select('*')
      .eq('section', section)
      .order('updated_at', { ascending: false })
  )
  return { data, error }
}

async function getByMember(memberName) {
  const { data, error } = await dbQuery(
    supabase
      .from('team_context')
      .select('*')
      .ilike('display_name', `%${memberName}%`)
      .order('updated_at', { ascending: false })
  )
  return { data, error }
}

function formatCard(card) {
  const sectionLabels = {
    building: '🔨 Building',
    perspective: '🧭 Perspective',
    goals: '🎯 Goals',
    decisions: '⚖️ Decisions',
    blockers: '🚧 Blockers',
    context: '📝 Notes',
  }
  const ago = (() => {
    const diff = Math.floor((Date.now() - new Date(card.updated_at)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  })()

  return [
    `${sectionLabels[card.section] || card.section} — ${card.is_pinned ? '📌 ' : ''}${card.title}`,
    `Author: ${card.display_name} (${ago})`,
    card.content,
    card.tags?.length ? `Tags: ${card.tags.map(t => '#' + t).join(' ')}` : null,
  ].filter(Boolean).join('\n')
}

function buildSummary(cards) {
  if (!cards || cards.length === 0) {
    return 'No context cards have been shared yet. The team board is empty.'
  }

  const byMember = {}
  cards.forEach(c => {
    if (!byMember[c.display_name]) byMember[c.display_name] = []
    byMember[c.display_name].push(c)
  })

  const lines = [
    `# CollabLance Team Context Summary`,
    `${cards.length} card(s) from ${Object.keys(byMember).length} member(s)\n`,
  ]

  for (const [member, memberCards] of Object.entries(byMember)) {
    lines.push(`## ${member}`)
    const bySection = {}
    memberCards.forEach(c => {
      if (!bySection[c.section]) bySection[c.section] = []
      bySection[c.section].push(c)
    })
    for (const [sec, secCards] of Object.entries(bySection)) {
      const labels = { building: 'Building', perspective: 'Perspective', goals: 'Goals', decisions: 'Decisions', blockers: 'Blockers', context: 'Notes' }
      lines.push(`### ${labels[sec] || sec}`)
      secCards.forEach(c => {
        lines.push(`**${c.title}**`)
        lines.push(c.content)
        if (c.tags?.length) lines.push(`_Tags: ${c.tags.join(', ')}_`)
        lines.push('')
      })
    }
  }

  return lines.join('\n')
}

// ── Tool execution ───────────────────────────────────────────────────────────
async function executeTool(name, args) {
  if (name === 'get_team_context') {
    const { data, error } = await getAllCards(args?.limit || 50)
    if (error) return { error: error.message }
    if (!data || data.length === 0) return { text: 'No context cards shared yet.' }
    return { text: data.map(formatCard).join('\n\n---\n\n') }
  }

  if (name === 'get_context_by_section') {
    const { data, error } = await getBySection(args.section)
    if (error) return { error: error.message }
    if (!data || data.length === 0) return { text: `No cards in section "${args.section}".` }
    return { text: data.map(formatCard).join('\n\n---\n\n') }
  }

  if (name === 'get_member_context') {
    const { data, error } = await getByMember(args.member_name)
    if (error) return { error: error.message }
    if (!data || data.length === 0) return { text: `No cards found for member "${args.member_name}".` }
    return { text: data.map(formatCard).join('\n\n---\n\n') }
  }

  if (name === 'get_context_summary') {
    const { data, error } = await getAllCards(200)
    if (error) return { error: error.message }
    return { text: buildSummary(data) }
  }

  if (name === 'post_my_context') {
    if (!supabase) return { error: 'Supabase not configured' }
    const { section, title, content, tags, user_id, display_name } = args
    const avatar_initial = (display_name || 'M')[0].toUpperCase()
    const { data, error } = await supabase
      .from('team_context')
      .insert({ user_id, display_name, avatar_initial, section, title, content, tags: tags || [] })
      .select()
      .single()
    if (error) return { error: error.message }
    return { text: `✅ Context card posted successfully!\nID: ${data.id}\nSection: ${section}\nTitle: ${title}` }
  }

  if (name === 'semantic_search_context') {
    if (!supabase) return { error: 'Supabase not configured' }
    const { query, threshold = 0.30, limit = 8 } = args

    // Generate query embedding via Gemini text-embedding-004
    let vectorResult = null

    if (GEMINI_API_KEY) {
      try {
        const embRes = await fetch(`${GEMINI_EMBED}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${GEMINI_MODEL}`,
            content: { parts: [{ text: query.slice(0, 2000) }] },
            taskType: 'RETRIEVAL_QUERY',
          }),
        })
        if (embRes.ok) {
          const embJson = await embRes.json()
          const embedding = embJson.embedding?.values
          if (embedding) {
            const { data, error } = await supabase.rpc('search_team_context', {
              query_embedding: embedding,
              match_threshold: threshold,
              match_count: limit,
            })
            if (!error && data) vectorResult = { data, mode: 'vector' }
          }
        } else {
          process.stderr.write(`[mcp] Gemini error: ${embRes.status}\n`)
        }
      } catch (err) {
        process.stderr.write(`[mcp] Gemini embedding error: ${err.message}\n`)
      }
    }

    // Fallback: ilike text search
    if (!vectorResult) {
      const q = `%${query}%`
      const { data, error } = await supabase
        .from('team_context')
        .select('*')
        .or(`title.ilike.${q},content.ilike.${q}`)
        .order('updated_at', { ascending: false })
        .limit(limit)
      if (error) return { error: error.message }
      vectorResult = { data, mode: 'text' }
    }

    const { data, mode } = vectorResult
    if (!data || data.length === 0) return { text: `No results found for: "${query}"` }

    const header = `Search mode: ${mode === 'vector' ? '🧠 vector (semantic)' : '🔤 text (keyword)'}\nQuery: "${query}"\n${data.length} result(s)\n`
    return { text: header + '\n---\n\n' + data.map(formatCard).join('\n\n---\n\n') }
  }

  return { error: `Unknown tool: ${name}` }
}

// ── MCP JSON-RPC stdio server ────────────────────────────────────────────────
let buffer = ''

process.stdin.setEncoding('utf8')

process.stdin.on('data', async (chunk) => {
  buffer += chunk
  const lines = buffer.split('\n')
  buffer = lines.pop() // keep incomplete line

  for (const line of lines) {
    if (!line.trim()) continue
    let msg
    try {
      msg = JSON.parse(line)
    } catch {
      continue
    }

    const response = await handleMessage(msg)
    if (response !== null) {
      process.stdout.write(JSON.stringify(response) + '\n')
    }
  }
})

async function handleMessage(msg) {
  const { id, method, params } = msg

  // initialize
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      },
    }
  }

  // initialized notification
  if (method === 'notifications/initialized') return null

  // list tools
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0', id,
      result: { tools: TOOLS },
    }
  }

  // call tool
  if (method === 'tools/call') {
    const { name, arguments: args } = params
    try {
      const result = await executeTool(name, args || {})
      if (result.error) {
        return {
          jsonrpc: '2.0', id,
          result: {
            content: [{ type: 'text', text: `Error: ${result.error}` }],
            isError: true,
          },
        }
      }
      return {
        jsonrpc: '2.0', id,
        result: {
          content: [{ type: 'text', text: result.text }],
        },
      }
    } catch (err) {
      return {
        jsonrpc: '2.0', id,
        result: {
          content: [{ type: 'text', text: `Unexpected error: ${err.message}` }],
          isError: true,
        },
      }
    }
  }

  // ping
  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} }
  }

  // unknown method
  return {
    jsonrpc: '2.0', id,
    error: { code: -32601, message: `Method not found: ${method}` },
  }
}

process.stderr.write(`[collablance-mcp] 🚀 CollabLance Context MCP Server v${SERVER_VERSION} ready\n`)
process.stderr.write(`[collablance-mcp] Supabase: ${SUPABASE_URL ? '✅ connected' : '❌ not configured'}\n`)
process.stderr.write(`[collablance-mcp] Gemini embeddings: ${GEMINI_API_KEY ? '✅ enabled (text-embedding-004)' : '⚠️  no key — semantic search will fall back to text'}\n`)

