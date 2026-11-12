import 'server-only'
import { verifyHmac } from './signature'

/**
 * lib/payments/razorpay.js — thin Razorpay REST client (no SDK needed).
 * Docs: Orders + Route transfers (on_hold), Route linked accounts (v2, composite).
 */

const API = 'https://api.razorpay.com'

// Off until a real Razorpay account (with Route) is set up — until then the
// app behaves as before: milestones can be approved without funding.
export function paymentsEnabled() {
  return process.env.PAYMENTS_ENABLED === 'true'
    && !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    && !!process.env.RAZORPAY_KEY_SECRET
    && !!process.env.SUPABASE_SERVICE_ROLE_KEY
}

async function rzp(path, { method = 'GET', body, idempotencyKey } = {}) {
  const auth = Buffer.from(`${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey }),
    },
    body: body && JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Razorpay ${method} ${path.split('?')[0]} failed: ${json.error?.description || res.status}`)
  }
  return json
}

export const createOrder = (body) => rzp('/v1/orders', { method: 'POST', body })

export async function fetchOrderTransfers(orderId) {
  const order = await rzp(`/v1/orders/${orderId}?expand[]=transfers`)
  return order.transfers?.items || []
}

export const releaseTransfer = (transferId) =>
  rzp(`/v1/transfers/${transferId}`, { method: 'PATCH', body: { on_hold: false } })

export const createLinkedAccount = (body, idempotencyKey) =>
  rzp('/v2/accounts', { method: 'POST', body, idempotencyKey })

// Checkout handler signature: HMAC-SHA256(order_id + "|" + payment_id, key secret).
// orderId must be the one we stored, not the one the browser sent back.
export const verifyPaymentSignature = (orderId, paymentId, signature) =>
  verifyHmac(process.env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`, signature)

// Webhook: X-Razorpay-Signature = HMAC-SHA256(raw body, webhook secret)
export const verifyWebhookSignature = (rawBody, signature) =>
  verifyHmac(process.env.RAZORPAY_WEBHOOK_SECRET, rawBody, signature)
