/**
 * lib/payments/money.js
 *
 * All escrow money math, in integer paise. Server-side only by convention —
 * the client never computes what anyone is paid.
 */

export const CLIENT_FEE_PERCENT = 5
export const TEAM_COMMISSION_PERCENT = 8

export function toPaise(rupees) {
  const paise = Math.round(Number(rupees) * 100)
  if (!Number.isSafeInteger(paise) || paise < 100) throw new Error('Milestone amount must be at least ₹1')
  return paise
}

/**
 * amountRupees: the milestone amount. splits: the signed contract's
 * [{user_id, percent}] (whole numbers summing to 100).
 * The client pays milestone + fee; the team's pool is milestone - commission,
 * split by percent. Platform keeps fee + commission (Razorpay's charges come out of that).
 */
export function computeMilestonePayment(amountRupees, splits) {
  const totalPercent = splits.reduce((sum, s) => sum + s.percent, 0)
  if (!splits.length || totalPercent !== 100 || !splits.every((s) => Number.isInteger(s.percent) && s.percent > 0)) {
    throw new Error('Split must be whole-number percentages summing to 100')
  }

  const milestone = toPaise(amountRupees)
  const clientFee = Math.round((milestone * CLIENT_FEE_PERCENT) / 100)
  const teamCommission = Math.round((milestone * TEAM_COMMISSION_PERCENT) / 100)
  const pool = milestone - teamCommission

  const payouts = splits.map((s) => ({ user_id: s.user_id, percent: s.percent, amount: Math.floor((pool * s.percent) / 100) }))
  // Rounding leaves a few paise over; give them to the largest share so payouts sum to the pool exactly
  const leftover = pool - payouts.reduce((sum, p) => sum + p.amount, 0)
  payouts.reduce((top, p) => (p.percent > top.percent ? p : top)).amount += leftover

  return { milestone, clientFee, teamCommission, total: milestone + clientFee, payouts }
}
