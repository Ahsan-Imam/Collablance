import { createClient } from '@/lib/supabase/server'
import { indexContextCards, unindexContextCard } from '@/lib/ai/contextSearch'
import { NextResponse } from 'next/server'

// PATCH /api/context/[id] — update a card + re-embed if content changed
export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { title, content, section, tags, is_pinned } = body

  const updates = {}
  if (title !== undefined) updates.title = title
  if (content !== undefined) updates.content = content
  if (section !== undefined) updates.section = section
  if (tags !== undefined) updates.tags = tags
  if (is_pinned !== undefined) updates.is_pinned = is_pinned

  const { data, error } = await supabase
    .from('team_context')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id,user_id,display_name,avatar_initial,section,title,content,tags,is_pinned,collective_id,project_id,updated_at,created_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
  // Re-index if the searchable text changed (pinning alone doesn't)
  if (title !== undefined || content !== undefined || section !== undefined || tags !== undefined) await indexContextCards([data])
  return NextResponse.json({ data })
}

// DELETE /api/context/[id] — delete a card (owner only)
export async function DELETE(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('team_context')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Only drop it from the search index if this user really deleted it
  if (data?.length) await unindexContextCard(id)
  return NextResponse.json({ success: true })
}
