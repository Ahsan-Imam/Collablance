import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/payments/razorpay'
import { markPaid } from '@/lib/payments/escrow'
import { NextResponse } from 'next/server'

// POST /api/payments/webhook — Razorpay → us. Source of truth for payments
// when the client closes the tab before Checkout's handler runs.
// Never remove: a missing webhook means payments that silently never record.
// Configure in Razorpay Dashboard → Webhooks with event: order.paid.
export async function POST(request) {
  const raw = await request.text()
  if (!verifyWebhookSignature(raw, request.headers.get('x-razorpay-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(raw)
  if (event.event === 'order.paid') {
    const orderId = event.payload?.order?.entity?.id
    const paymentId = event.payload?.payment?.entity?.id
    try {
      await markPaid(createAdminClient(), orderId, paymentId, 'webhook')
    } catch (err) {
      console.error('[payments] webhook markPaid failed for order', orderId, err.message)
      return NextResponse.json({ error: 'Not recorded' }, { status: 500 }) // non-2xx → Razorpay retries
    }
  }
  return NextResponse.json({ ok: true })
}
