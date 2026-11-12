import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/admin/payments/[id]/refunded — a platform admin records that they
// refunded this payment in the Razorpay dashboard. Moves no money itself.
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: me } = await supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { id } = await params
  const admin = createAdminClient()
  const { data: payment, error } = await admin.from('milestone_payments').select('id, total_amount').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  const { error: logErr } = await admin.from('payment_events').insert({
    payment_id: id, event: 'refunded_manually', amount: payment.total_amount, data: { by: user.id },
  })
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
