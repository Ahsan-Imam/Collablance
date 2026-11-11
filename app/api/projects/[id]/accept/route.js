import { createClient } from '@/lib/supabase/server'
import { getProjectMembership, canAcceptProject } from '@/lib/projectAcceptance'
import { getSignedContract, CONTRACT_REQUIRED_ERROR } from '@/lib/contracts'
import { NextResponse } from 'next/server'

// GET /api/projects/[id]/accept — workspace access/acceptance status
export async function GET(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, title, collective_id, owner_id, status, accepted_at, accepted_by, collectives(id,name,avatar_initial)')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const membership = await getProjectMembership(supabase, user.id, project.collective_id)
  const signedContract = project.collective_id ? await getSignedContract(supabase, id, project.collective_id) : null

  return NextResponse.json({
    project,
    isOwner: project.owner_id === user.id,
    isMember: !!membership,
    canAccept: !!membership && ['owner', 'admin'].includes(membership.role),
    accepted: !!project.accepted_at,
    contractSigned: !!signedContract,
  })
}

// POST /api/projects/[id]/accept — team lead accepts the project, opening its workspace
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: project, error: fetchErr } = await supabase
    .from('projects')
    .select('id, collective_id, status, accepted_at')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!project.collective_id) {
    return NextResponse.json({ error: "This project isn't assigned to a team" }, { status: 400 })
  }
  if (project.accepted_at) {
    return NextResponse.json({ error: 'Already accepted' }, { status: 409 })
  }

  const allowed = await canAcceptProject(supabase, user.id, project.collective_id)
  if (!allowed) {
    return NextResponse.json({ error: 'Only a team owner or admin can accept this project' }, { status: 403 })
  }

  const signedContract = await getSignedContract(supabase, id, project.collective_id)
  if (!signedContract) {
    return NextResponse.json({ error: CONTRACT_REQUIRED_ERROR }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('projects')
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
      status: project.status === 'open' ? 'in_progress' : project.status,
    })
    .eq('id', id)
    .select('*, collectives(id, name, avatar_initial, focus_area)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
