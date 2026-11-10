import { createClient } from '@/lib/supabase/server'
import { getProjectAccess } from '@/lib/projectAccess'
import { NextResponse } from 'next/server'

const COLUMNS = 'id,project_id,user_id,display_name,avatar_initial,content,created_at'

// GET /api/projects/[id]/messages
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { isOwner, isTeamMember, error: accessErr } = await getProjectAccess(supabase, user.id, id)
  if (accessErr) return NextResponse.json({ error: accessErr }, { status: accessErr === 'Project not found' ? 404 : 500 })
  if (!isOwner && !isTeamMember) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { data, error } = await supabase
    .from('project_messages')
    .select(COLUMNS)
    .eq('project_id', id)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/projects/[id]/messages
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { isOwner, isTeamMember, error: accessErr } = await getProjectAccess(supabase, user.id, id)
  if (accessErr) return NextResponse.json({ error: accessErr }, { status: accessErr === 'Project not found' ? 404 : 500 })
  if (!isOwner && !isTeamMember) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const body = await request.json()
  const content = body.content?.trim()
  if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 })
  if (content.length > 4000) return NextResponse.json({ error: 'Message is too long' }, { status: 400 })

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member'
  const avatarInitial = displayName[0]?.toUpperCase() || 'M'

  const { data, error } = await supabase
    .from('project_messages')
    .insert({ project_id: id, user_id: user.id, display_name: displayName, avatar_initial: avatarInitial, content })
    .select(COLUMNS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
