import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentsEnabled } from '@/lib/payments/razorpay'
import { releaseMilestone } from '@/lib/payments/escrow'
import { notify, teamMemberIds } from '@/lib/notify'
import { NextResponse, after } from 'next/server'

const NEXT_STATUS = { release_to_team: 'approved', return_to_team: 'pending', refund_client: 'refunded' }

// POST /api/admin/milestones/[id]/rule — a platform admin rules on a disputed milestone
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: me } = await supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { id } = await params
  const { outcome, note } = await request.json()
  if (!NEXT_STATUS[outcome]) return NextResponse.json({ error: 'Unknown outcome' }, { status: 400 })
  if (!note?.trim() || note.trim().length < 10) return NextResponse.json({ error: 'Give a reason for the ruling' }, { status: 400 })

  const admin = createAdminClient()
  const now = new Date().toISOString()
  // .eq('status', 'disputed') makes a double-click or a second admin a no-op
  const { data: milestone, error } = await admin
    .from('milestones')
    .update({
      status: NEXT_STATUS[outcome],
      ...(outcome === 'release_to_team' && { approved_at: now, approved_by: user.id }),
      ...(outcome === 'return_to_team' && { submitted_at: null }),
    })
    .eq('id', id)
    .eq('status', 'disputed')
    .select('id, title, funded_at, project_id, projects(owner_id, collective_id)')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!milestone) return NextResponse.json({ error: 'This milestone is not in dispute' }, { status: 400 })

  const { error: logErr } = await admin.from('dispute_rulings').insert({ milestone_id: id, ruled_by: user.id, outcome, note: note.trim() })
  if (logErr) console.error('[admin] ruling applied but not logged for milestone', id, logErr.message)

  after(async () => {
    const team = await teamMemberIds(admin, milestone.projects.collective_id)
    await notify([milestone.projects.owner_id, ...team], `Dispute ruling: ${milestone.title}`, `CollabLance ruled on this dispute: ${outcome.replaceAll('_', ' ')}.\n\nReason: ${note.trim()}`, `/projects/${milestone.project_id}`)
  })

  let warning
  if (outcome === 'release_to_team' && milestone.funded_at && paymentsEnabled()) {
    try {
      await releaseMilestone(admin, id)
    } catch (err) {
      console.error('[admin] release after ruling failed for milestone', id, err.message)
      warning = 'Ruling recorded, but paying the team failed. The client can use “Retry payout” on the project page.'
    }
  }
  // shortcut: refunds aren't automated — reverse the Route transfers and refund in the Razorpay dashboard; automate once disputes are frequent
  if (outcome === 'refund_client' && milestone.funded_at) {
    warning = 'Ruling recorded. Now reverse the transfers and refund this payment in the Razorpay dashboard.'
  }
  return NextResponse.json({ ok: true, warning })
}
