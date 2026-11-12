import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentsEnabled, verifyPaymentSignature } from '@/lib/payments/razorpay'
import { markPaid } from '@/lib/payments/escrow'
import { NextResponse } from 'next/server'

// POST /api/payments/verify — Checkout's success handler posts here. The
// signature proves Razorpay saw the payment; the webhook confirms it too.
export async function POST(request) {
  if (!paymentsEnabled()) return NextResponse.json({ error: 'Payments aren’t live yet' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = await request.json()
  if (!orderId || !paymentId || !signature) return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })

  const admin = createAdminClient()
  const { data: payment, error } = await admin
    .from('milestone_payments')
    .select('razorpay_order_id, payer_id')
    .eq('razorpay_order_id', orderId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!payment || payment.payer_id !== user.id) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  if (!verifyPaymentSignature(payment.razorpay_order_id, paymentId, signature)) {
    console.error('[payments] bad checkout signature for order', orderId)
    return NextResponse.json({ error: 'Payment could not be verified' }, { status: 400 })
  }

  try {
    await markPaid(admin, orderId, paymentId, 'checkout')
    return NextResponse.json({ data: { funded: true } })
  } catch (err) {
    console.error('[payments] markPaid failed for order', orderId, err.message)
    return NextResponse.json({ error: 'Payment received but not recorded yet — it will update shortly' }, { status: 500 })
  }
}
