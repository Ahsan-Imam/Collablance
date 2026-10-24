import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, buildEmbeddingText } from '@/lib/embeddings'
import { NextResponse } from 'next/server'

// GET /api/context — fetch all context cards (optionally filtered)
export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section')
  const collectiveId = searchParams.get('collective_id')

  let query = supabase
    .from('team_context')
    .select('id,user_id,display_name,avatar_initial,section,title,content,tags,is_pinned,collective_id,project_id,updated_at,created_at')
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (section) query = query.eq('section', section)
  if (collectiveId) query = query.eq('collective_id', collectiveId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/context — create a new context card + auto-embed
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { section, title, content, tags, collective_id, project_id } = body

  if (!section || !title || !content) {
    return NextResponse.json({ error: 'section, title and content are required' }, { status: 400 })
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member'
  const avatarInitial = displayName[0]?.toUpperCase() || 'M'

  // Generate embedding (non-blocking fail — card still saves if OpenAI is down/unconfigured)
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
      collective_id: collective_id || null,
      project_id: project_id || null,
      embedding: embedding ?? null,
      embedding_text: embedding ? embeddingText : null,
    })
    .select('id,user_id,display_name,avatar_initial,section,title,content,tags,is_pinned,collective_id,project_id,updated_at,created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    embedded: embedding !== null,
  }, { status: 201 })
}
