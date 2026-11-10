import { createClient } from '@/lib/supabase/server'
import { getProjectAccess } from '@/lib/projectAccess'
import { NextResponse } from 'next/server'

const COLUMNS = 'id,project_id,reviewer_id,direction,collective_id,rated_user_id,rating,comment,created_at'

// GET /api/projects/[id]/reviews
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { isOwner, isTeamMember, error: accessErr } = await getProjectAccess(supabase, user.id, id)
  if (accessErr) return NextResponse.json({ error: accessErr }, { status: accessErr === 'Project not found' ? 404 : 500 })
  if (!isOwner && !isTeamMember) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { data, error } = await supabase
    .from('reviews')
    .select(COLUMNS)
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/projects/[id]/reviews — one review per (project, reviewer, direction),
// only once the project is completed.
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { project, isOwner, isTeamMember, error: accessErr } = await getProjectAccess(supabase, user.id, id)
  if (accessErr) return NextResponse.json({ error: accessErr }, { status: accessErr === 'Project not found' ? 404 : 500 })
  if (!isOwner && !isTeamMember) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  if (project.status !== 'completed') {
    return NextResponse.json({ error: 'Reviews open once the project is marked completed' }, { status: 400 })
  }

  const body = await request.json()
  const { direction, rating, comment } = body

  if (!['client_to_team', 'team_to_client'].includes(direction)) {
    return NextResponse.json({ error: 'direction must be client_to_team or team_to_client' }, { status: 400 })
  }
  if (direction === 'client_to_team' && !isOwner) {
    return NextResponse.json({ error: 'Only the project owner can review the team' }, { status: 403 })
  }
  if (direction === 'team_to_client' && !isTeamMember) {
    return NextResponse.json({ error: 'Only a team member can review the client' }, { status: 403 })
  }
  if (direction === 'client_to_team' && !project.collective_id) {
    return NextResponse.json({ error: 'This project has no team to review' }, { status: 400 })
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be an integer 1-5' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      project_id: id,
      reviewer_id: user.id,
      direction,
      collective_id: direction === 'client_to_team' ? project.collective_id : null,
      rated_user_id: direction === 'team_to_client' ? project.owner_id : null,
      rating,
      comment: comment?.trim() || null,
    })
    .select(COLUMNS)
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: "You've already left this review" }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
