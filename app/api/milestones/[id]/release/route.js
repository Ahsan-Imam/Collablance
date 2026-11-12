import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProjectAccess } from '@/lib/projectAccess'
import { paymentsEnabled } from '@/lib/payments/razorpay'
import { releaseMilestone } from '@/lib/payments/escrow'
import { NextResponse } from 'next/server'

// POST /api/milestones/[id]/release — retry paying the team for an approved
// milestone if the automatic release on approval failed. Safe to repeat.
export async function POST(request, { params }) {
  if (!paymentsEnabled()) return NextResponse.json({ error: 'Payments aren’t live yet' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: milestone } = await supabase.from('milestones').select('id, project_id, status').eq('id', id).maybeSingle()
  if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })

  const { isOwner, error: accessErr } = await getProjectAccess(supabase, user.id, milestone.project_id)
  if (accessErr) return NextResponse.json({ error: accessErr }, { status: 500 })
  if (!isOwner) return NextResponse.json({ error: 'Only the client can release payment' }, { status: 403 })
  if (milestone.status !== 'approved') return NextResponse.json({ error: 'Only an approved milestone can be released' }, { status: 400 })

  try {
    const { released } = await releaseMilestone(createAdminClient(), id)
    if (!released) return NextResponse.json({ error: 'This milestone was never funded' }, { status: 400 })
    return NextResponse.json({ data: { status: 'paid' } })
  } catch (err) {
    console.error('[payments] release failed for milestone', id, err.message)
    return NextResponse.json({ error: 'Release failed — try again in a minute' }, { status: 502 })
  }
}
