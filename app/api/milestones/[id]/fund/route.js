import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProjectAccess } from '@/lib/projectAccess'
import { paymentsEnabled } from '@/lib/payments/razorpay'
import { createMilestoneOrder } from '@/lib/payments/escrow'
import { NextResponse } from 'next/server'

// POST /api/milestones/[id]/fund — client starts paying a milestone into escrow.
// Returns a Razorpay order for Checkout; funds are confirmed by /api/payments/verify
// or the webhook, never by this route.
export async function POST(request, { params }) {
  if (!paymentsEnabled()) return NextResponse.json({ error: 'Payments aren’t live yet' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: milestone, error: mErr } = await supabase
    .from('milestones')
    .select('id, project_id, title, amount, status, funded_at')
    .eq('id', id)
    .maybeSingle()
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })
  if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })

  const { project, isOwner, error: accessErr } = await getProjectAccess(supabase, user.id, milestone.project_id)
  if (accessErr) return NextResponse.json({ error: accessErr }, { status: 500 })
  if (!isOwner) return NextResponse.json({ error: 'Only the client can fund a milestone' }, { status: 403 })
  if (!project.collective_id || project.status !== 'in_progress') {
    return NextResponse.json({ error: 'Fund milestones once a team has accepted the project' }, { status: 400 })
  }
  if (milestone.funded_at) return NextResponse.json({ error: 'This milestone is already funded' }, { status: 409 })
  if (milestone.status !== 'pending') return NextResponse.json({ error: 'Only a milestone that hasn’t started can be funded' }, { status: 400 })

  try {
    const result = await createMilestoneOrder(createAdminClient(), { milestone, project, payerId: user.id })
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({
      data: {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: result.order.id,
        amount: result.money.total,
        currency: 'INR',
        milestone_amount: result.money.milestone,
        client_fee: result.money.clientFee,
        description: milestone.title,
      },
    })
  } catch (err) {
    console.error('[payments] fund failed for milestone', id, err.message)
    return NextResponse.json({ error: 'Couldn’t start the payment. Please try again.' }, { status: 502 })
  }
}
