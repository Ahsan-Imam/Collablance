import { createClient } from '@/lib/supabase/server'
import { getProjectAccess } from '@/lib/projectAccess'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentsEnabled } from '@/lib/payments/razorpay'
import { releaseMilestone } from '@/lib/payments/escrow'
import { canMoveMilestone } from '@/lib/milestones'
import { notify, teamMemberIds } from '@/lib/notify'
import { NextResponse, after } from 'next/server'

const COLUMNS = 'id,project_id,title,description,amount,currency,order_index,status,due_date,submitted_at,approved_at,approved_by,funded_at,created_at,updated_at'

async function loadMilestone(supabase, id) {
  return supabase.from('milestones').select('id,project_id,title,status,funded_at').eq('id', id).maybeSingle()
}

// PATCH /api/milestones/[id] — status transitions, role-restricted.
// 'paid' is never settable here — approving a funded milestone releases the
// escrow, and lib/payments marks it paid.
export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: milestone, error: fetchErr } = await loadMilestone(supabase, id)
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })

  const { project, isOwner, isTeamMember, error: accessErr } = await getProjectAccess(supabase, user.id, milestone.project_id)
  if (accessErr) return NextResponse.json({ error: accessErr }, { status: 500 })
  if (!isOwner && !isTeamMember) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const body = await request.json()
  const { status, title, description, amount, due_date, order_index } = body

  const updates = {}

  // Non-status edits: owner only, and only while still pending (hasn't started)
  const editingFields = title !== undefined || description !== undefined || amount !== undefined || due_date !== undefined || order_index !== undefined
  if (editingFields) {
    if (!isOwner) return NextResponse.json({ error: 'Only the project owner can edit a milestone' }, { status: 403 })
    if (milestone.status !== 'pending') return NextResponse.json({ error: 'Can only edit a milestone before it has been submitted' }, { status: 400 })
    if (milestone.funded_at) return NextResponse.json({ error: 'A funded milestone can’t be edited' }, { status: 400 })
    if (title !== undefined) updates.title = title.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (amount !== undefined) updates.amount = Number(amount)
    if (due_date !== undefined) updates.due_date = due_date || null
    if (order_index !== undefined) updates.order_index = order_index
  }

  if (status !== undefined) {
    const from = milestone.status
    const valid = canMoveMilestone(from, status, { isOwner, isTeamMember, funded: !!milestone.funded_at })

    if (!valid) {
      return NextResponse.json({ error: `Cannot move milestone from "${from}" to "${status}" with your role` }, { status: 400 })
    }
    if (paymentsEnabled() && ['submitted', 'approved'].includes(status) && !milestone.funded_at) {
      return NextResponse.json({ error: 'The client needs to fund this milestone first' }, { status: 400 })
    }

    updates.status = status
    if (status === 'submitted') updates.submitted_at = new Date().toISOString()
    if (status === 'approved') { updates.approved_at = new Date().toISOString(); updates.approved_by = user.id }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('milestones')
    .update(updates)
    .eq('id', id)
    .select(COLUMNS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status) {
    const path = `/projects/${project.id}`
    after(async () => {
      const team = await teamMemberIds(supabase, project.collective_id)
      if (status === 'submitted') await notify([project.owner_id], `Milestone submitted: ${milestone.title}`, 'The team submitted a milestone for your review. Approve it or send it back.', path)
      if (status === 'approved') await notify(team, `Milestone approved: ${milestone.title}`, 'The client approved your milestone.', path)
      if (status === 'pending') await notify(team, `Milestone sent back: ${milestone.title}`, 'The client sent this milestone back for changes.', path)
      if (status === 'disputed') await notify([project.owner_id, ...team], `Milestone disputed: ${milestone.title}`, 'A dispute was raised on this milestone. Any payment for it stays on hold until the dispute is resolved.', path)
    })
  }

  // Approval releases the team's held payouts. If Razorpay fails, the approval
  // still stands and the client can retry via POST /api/milestones/[id]/release.
  if (status === 'approved' && paymentsEnabled()) {
    try {
      await releaseMilestone(createAdminClient(), id)
      return NextResponse.json({ data: { ...data, status: 'paid' } })
    } catch (err) {
      console.error('[payments] release on approval failed for milestone', id, err.message)
      return NextResponse.json({ data, releaseError: 'Approved, but paying the team failed — use “Retry payout”.' })
    }
  }
  return NextResponse.json({ data })
}

// DELETE /api/milestones/[id] — owner only, and only before any work started
export async function DELETE(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: milestone, error: fetchErr } = await loadMilestone(supabase, id)
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })

  const { isOwner, error: accessErr } = await getProjectAccess(supabase, user.id, milestone.project_id)
  if (accessErr) return NextResponse.json({ error: accessErr }, { status: 500 })
  if (!isOwner) return NextResponse.json({ error: 'Only the project owner can delete a milestone' }, { status: 403 })
  if (milestone.status !== 'pending') return NextResponse.json({ error: 'Can only delete a milestone before it has been submitted' }, { status: 400 })
  if (milestone.funded_at) return NextResponse.json({ error: 'A funded milestone can’t be deleted' }, { status: 400 })

  const { error } = await supabase.from('milestones').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
