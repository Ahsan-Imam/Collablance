import { createClient } from '@/lib/supabase/server'
import { canAcceptProject } from '@/lib/projectAcceptance'
import { getSignedContract, CONTRACT_REQUIRED_ERROR } from '@/lib/contracts'
import { notify } from '@/lib/notify'
import { NextResponse, after } from 'next/server'

// PATCH /api/applications/[id] — accept/reject (project owner) or withdraw
// (the applying team's owner/admin). Accepting assigns the project to that
// team and opens its workspace immediately, since applying + accepting is
// the mutual agreement — no separate confirmation step needed.
export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action } = await request.json()
  if (!['accept', 'reject', 'withdraw'].includes(action)) {
    return NextResponse.json({ error: 'action must be accept, reject, or withdraw' }, { status: 400 })
  }

  const { data: application, error: fetchErr } = await supabase
    .from('project_applications')
    .select('id, project_id, collective_id, applied_by, status, projects(owner_id, title, status, collective_id)')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  if (application.status !== 'pending') return NextResponse.json({ error: 'This application was already resolved' }, { status: 400 })

  const isProjectOwner = application.projects.owner_id === user.id
  const isTeamLead = await canAcceptProject(supabase, user.id, application.collective_id)

  if (action === 'withdraw') {
    if (!isTeamLead) return NextResponse.json({ error: 'Only your team lead can withdraw this application' }, { status: 403 })
  } else if (!isProjectOwner) {
    return NextResponse.json({ error: 'Only the project owner can accept or reject applications' }, { status: 403 })
  }

  if (action === 'reject' || action === 'withdraw') {
    const status = action === 'reject' ? 'rejected' : 'withdrawn'
    const { data, error } = await supabase
      .from('project_applications')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, status, responded_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (action === 'reject') after(() => notify([application.applied_by], `Proposal not selected: ${application.projects.title}`, 'The client chose not to go ahead with your team\'s proposal.', '/projects'))
    return NextResponse.json({ data })
  }

  // accept — the project must still be open and unassigned
  if (application.projects.status !== 'open' || application.projects.collective_id) {
    return NextResponse.json({ error: 'This project is no longer open for applications' }, { status: 400 })
  }

  const signedContract = await getSignedContract(supabase, application.project_id, application.collective_id)
  if (!signedContract) {
    return NextResponse.json({ error: CONTRACT_REQUIRED_ERROR }, { status: 400 })
  }

  const { data: updatedApplication, error: acceptErr } = await supabase
    .from('project_applications')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status, responded_at')
    .single()
  if (acceptErr) return NextResponse.json({ error: acceptErr.message }, { status: 500 })

  const { error: projectErr } = await supabase
    .from('projects')
    .update({
      collective_id: application.collective_id,
      status: 'in_progress',
      accepted_at: new Date().toISOString(),
      accepted_by: application.applied_by,
    })
    .eq('id', application.project_id)
  if (projectErr) return NextResponse.json({ error: projectErr.message }, { status: 500 })

  // Every other pending application for this project is now moot
  await supabase
    .from('project_applications')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('project_id', application.project_id)
    .eq('status', 'pending')
    .neq('id', id)

  after(() => notify([application.applied_by], `Proposal accepted: ${application.projects.title}`, 'The client accepted your team\'s proposal. The project workspace is open.', `/projects/${application.project_id}`))
  return NextResponse.json({ data: updatedApplication })
}
