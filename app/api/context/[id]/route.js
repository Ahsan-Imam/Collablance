import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, buildEmbeddingText } from '@/lib/embeddings'
import { NextResponse } from 'next/server'

// PATCH /api/context/[id] — update a card + re-embed if content changed
export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { title, content, section, tags, is_pinned } = body

  // Fetch current card to build embedding text (we need all fields)
  const { data: current, error: fetchErr } = await supabase
    .from('team_context')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !current) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
  }

  const updates = {}
  if (title !== undefined) updates.title = title
  if (content !== undefined) updates.content = content
  if (section !== undefined) updates.section = section
  if (tags !== undefined) updates.tags = tags
  if (is_pinned !== undefined) updates.is_pinned = is_pinned

  // Re-embed if any text field changed
  const contentChanged = title !== undefined || content !== undefined || section !== undefined || tags !== undefined
  if (contentChanged) {
    const merged = {
      section:      section      ?? current.section,
      title:        title        ?? current.title,
      content:      content      ?? current.content,
      tags:         tags         ?? current.tags,
      display_name: current.display_name,
    }
    const embeddingText = buildEmbeddingText(merged)
    const embedding = await generateEmbedding(embeddingText)
    if (embedding) {
      updates.embedding      = embedding
      updates.embedding_text = embeddingText
    }
  }

  const { data, error } = await supabase
    .from('team_context')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id,user_id,display_name,avatar_initial,section,title,content,tags,is_pinned,collective_id,project_id,updated_at,created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
  return NextResponse.json({ data })
}

// DELETE /api/context/[id] — delete a card (owner only)
export async function DELETE(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('team_context')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
