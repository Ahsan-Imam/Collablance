import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentsEnabled } from '@/lib/payments/razorpay'
import { releaseMilestone } from '@/lib/payments/escrow'
import { NextResponse } from 'next/server'

// POST /api/admin/milestones/[id]/release — a platform admin retries paying the
// team for an approved milestone whose automatic release failed. Safe to repeat.
export async function POST(request, { params }) {
  if (!paymentsEnabled()) return NextResponse.json({ error: 'Payments aren’t live yet' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: me } = await supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { id } = await params
  const admin = createAdminClient()
  const { data: milestone, error } = await admin.from('milestones').select('status').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (milestone?.status !== 'approved') return NextResponse.json({ error: 'Only an approved milestone can be released' }, { status: 400 })

  try {
    const { released } = await releaseMilestone(admin, id)
    if (!released) return NextResponse.json({ error: 'This milestone was never funded' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin] release retry failed for milestone', id, err.message)
    return NextResponse.json({ error: `Release failed: ${err.message}` }, { status: 502 })
  }
}
