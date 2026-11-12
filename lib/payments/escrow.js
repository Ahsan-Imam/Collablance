import 'server-only'
import { createOrder, fetchOrderTransfers, releaseTransfer } from './razorpay'
import { computeMilestonePayment } from './money'

/**
 * lib/payments/escrow.js — milestone escrow flows. Every function takes the
 * service-role client (lib/supabase/admin.js); the calling route must already
 * have checked the user is allowed. Every money event is logged to
 * payment_events, failures included, before anything throws.
 */

async function logEvent(admin, paymentId, event, amount, data) {
  const { error } = await admin.from('payment_events').insert({ payment_id: paymentId, event, amount, data })
  if (error) console.error('[payments] failed to log event', event, paymentId, error.message)
}

// Create a Razorpay order whose transfers hold each member's share until release
export async function createMilestoneOrder(admin, { milestone, project, payerId }) {
  const { data: contract, error: cErr } = await admin
    .from('project_contracts')
    .select('splits')
    .eq('project_id', project.id)
    .eq('collective_id', project.collective_id)
    .eq('status', 'signed')
    .maybeSingle()
  if (cErr) throw new Error(cErr.message)
  if (!contract) return { error: 'This project has no signed payment split', status: 400 }

  const memberIds = contract.splits.map((s) => s.user_id)
  const { data: accounts, error: aErr } = await admin
    .from('payout_accounts')
    .select('user_id, razorpay_account_id')
    .in('user_id', memberIds)
  if (aErr) throw new Error(aErr.message)
  const accountFor = Object.fromEntries(accounts.map((a) => [a.user_id, a.razorpay_account_id]))
  const missing = memberIds.filter((id) => !accountFor[id]).length
  if (missing) {
    return { error: `${missing} team member${missing > 1 ? 's haven’t' : ' hasn’t'} added payout details yet — ask them to add them in their profile`, status: 400 }
  }

  const money = computeMilestonePayment(milestone.amount, contract.splits)
  const payouts = money.payouts.map((p) => ({ ...p, account: accountFor[p.user_id] }))

  // Reuse an unpaid order for the same amount: Razorpay lets an order be paid
  // only once, so a second tab or click can't charge the client twice.
  const { data: open, error: oErr } = await admin
    .from('milestone_payments')
    .select('razorpay_order_id')
    .eq('milestone_id', milestone.id)
    .eq('payer_id', payerId)
    .eq('status', 'created')
    .eq('milestone_amount', money.milestone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (oErr) throw new Error(oErr.message)
  if (open) return { order: { id: open.razorpay_order_id }, money }

  const order = await createOrder({
    amount: money.total,
    currency: 'INR',
    receipt: `ms_${milestone.id.slice(0, 30)}`,
    notes: { milestone_id: milestone.id, project_id: project.id },
    transfers: payouts.map((p) => ({
      account: p.account,
      amount: p.amount,
      currency: 'INR',
      on_hold: true,
      notes: { milestone_id: milestone.id },
    })),
  })

  const { data: payment, error: pErr } = await admin
    .from('milestone_payments')
    .insert({
      milestone_id: milestone.id,
      project_id: project.id,
      payer_id: payerId,
      razorpay_order_id: order.id,
      milestone_amount: money.milestone,
      client_fee: money.clientFee,
      team_commission: money.teamCommission,
      total_amount: money.total,
      payouts,
    })
    .select('id')
    .single()
  if (pErr) throw new Error(pErr.message)
  await logEvent(admin, payment.id, 'order_created', money.total, { razorpay_order_id: order.id, payer_id: payerId })

  return { order, money }
}

// Idempotent: called by both the checkout handler and the webhook, whichever comes first
export async function markPaid(admin, orderId, paymentId, source) {
  const now = new Date().toISOString()
  const { data: payment, error } = await admin
    .from('milestone_payments')
    .update({ status: 'paid', razorpay_payment_id: paymentId, paid_at: now })
    .eq('razorpay_order_id', orderId)
    .eq('status', 'created')
    .select('id, milestone_id, total_amount')
    .maybeSingle()

  if (error) {
    if (error.code !== '23505') throw new Error(error.message)
    // A second checkout for an already-funded milestone was paid — needs a manual refund.
    // Not thrown: a retry can't fix it and would only log it again.
    const { data: dup } = await admin.from('milestone_payments').select('id, total_amount').eq('razorpay_order_id', orderId).maybeSingle()
    if (dup) await logEvent(admin, dup.id, 'duplicate_payment_needs_refund', dup.total_amount, { razorpay_payment_id: paymentId, source, error: error.message })
    return false
  }
  if (!payment) {
    // Already recorded (or unknown order). If the earlier call recorded the payment
    // but failed to mark the milestone funded, this retry finishes the job.
    const { data: prior, error: priorErr } = await admin
      .from('milestone_payments')
      .select('milestone_id, paid_at')
      .eq('razorpay_order_id', orderId)
      .in('status', ['paid', 'released'])
      .maybeSingle()
    if (priorErr) throw new Error(priorErr.message)
    if (prior) {
      const { error: healErr } = await admin.from('milestones').update({ funded_at: prior.paid_at }).eq('id', prior.milestone_id).is('funded_at', null)
      if (healErr) throw new Error(healErr.message)
    }
    return false
  }

  const { error: mErr } = await admin.from('milestones').update({ funded_at: now }).eq('id', payment.milestone_id)
  await logEvent(admin, payment.id, 'paid', payment.total_amount, { razorpay_payment_id: paymentId, source, milestone_update_error: mErr?.message })
  if (mErr) throw new Error(mErr.message)
  return true
}

// Release every held transfer for an approved milestone and mark it paid.
// Safe to retry: already-released transfers are skipped.
export async function releaseMilestone(admin, milestoneId) {
  const { data: payment, error } = await admin
    .from('milestone_payments')
    .select('id, razorpay_order_id, milestone_amount, team_commission, status')
    .eq('milestone_id', milestoneId)
    .in('status', ['paid', 'released'])
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!payment) return { released: false }

  if (payment.status === 'paid') {
    try {
      const transfers = await fetchOrderTransfers(payment.razorpay_order_id)
      for (const t of transfers) {
        if (t.on_hold) await releaseTransfer(t.id)
      }
    } catch (err) {
      await logEvent(admin, payment.id, 'release_failed', payment.milestone_amount - payment.team_commission, { error: err.message })
      throw err
    }
    const now = new Date().toISOString()
    const { error: relErr } = await admin.from('milestone_payments').update({ status: 'released', released_at: now }).eq('id', payment.id)
    // The transfers are out; a retry skips them and records the release
    if (relErr) throw new Error(relErr.message)
    await logEvent(admin, payment.id, 'released', payment.milestone_amount - payment.team_commission, null)
  }

  const { error: mErr } = await admin.from('milestones').update({ status: 'paid' }).eq('id', milestoneId).eq('status', 'approved')
  if (mErr) throw new Error(mErr.message)
  return { released: true }
}
