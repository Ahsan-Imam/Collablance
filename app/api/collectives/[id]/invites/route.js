import { createClient } from '@/lib/supabase/server'
import { canAcceptProject } from '@/lib/projectAcceptance'
import { NextResponse } from 'next/server'

// canAcceptProject just checks "is owner/admin of this collective" — the
// name is project-acceptance-specific but the membership check is generic.

// GET /api/collectives/[id]/invites — invites this team has sent (team lead only)
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const allowed = await canAcceptProject(supabase, user.id, id)
  if (!allowed) return NextResponse.json({ error: 'Only a team owner or admin can view invites' }, { status: 403 })

  const { data, error } = await supabase
    .from('team_invites')
    .select('id, invited_user_id, status, created_at, responded_at')
    .eq('collective_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/collectives/[id]/invites — invite a specific freelancer
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const allowed = await canAcceptProject(supabase, user.id, id)
  if (!allowed) return NextResponse.json({ error: 'Only a team owner or admin can send invites' }, { status: 403 })

  const body = await request.json()
  const invitedUserId = body.user_id
  if (!invitedUserId) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

  const { data: existingMember } = await supabase
    .from('collective_members')
    .select('collective_id')
    .eq('collective_id', id)
    .eq('user_id', invitedUserId)
    .maybeSingle()
  if (existingMember) return NextResponse.json({ error: 'They are already on this team' }, { status: 400 })

  const { data, error } = await supabase
    .from('team_invites')
    .insert({ collective_id: id, invited_user_id: invitedUserId, invited_by: user.id })
    .select('id, invited_user_id, status, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'They already have a pending invite from this team' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
