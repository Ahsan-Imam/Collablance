import { createClient } from '@/lib/supabase/server'
import { getProjectAccess } from '@/lib/projectAccess'
import { NextResponse } from 'next/server'

const COLUMNS = 'id,project_id,title,description,amount,currency,order_index,status,due_date,submitted_at,approved_at,approved_by,created_at,updated_at'

async function loadMilestone(supabase, id) {
  return supabase.from('milestones').select('id,project_id,status').eq('id', id).maybeSingle()
}

// PATCH /api/milestones/[id] — status transitions, role-restricted.
// 'paid' is intentionally not settable here — that only happens once
// payments are wired up, via the Razorpay webhook.
export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: milestone, error: fetchErr } = await loadMilestone(supabase, id)
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })

  const { isOwner, isTeamMember, error: accessErr } = await getProjectAccess(supabase, user.id, milestone.project_id)
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
    if (title !== undefined) updates.title = title.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (amount !== undefined) updates.amount = Number(amount)
    if (due_date !== undefined) updates.due_date = due_date || null
    if (order_index !== undefined) updates.order_index = order_index
  }

  if (status !== undefined) {
    const from = milestone.status
    const valid =
      (status === 'submitted' && isTeamMember && from === 'pending') ||
      (status === 'pending' && isOwner && from === 'submitted') ||            // sent back for changes
      (status === 'approved' && isOwner && from === 'submitted') ||
      (status === 'disputed' && (isOwner || isTeamMember) && ['submitted', 'approved'].includes(from))

    if (!valid) {
      return NextResponse.json({ error: `Cannot move milestone from "${from}" to "${status}" with your role` }, { status: 400 })
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

  const { error } = await supabase.from('milestones').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
