// Run: node lib/payments/money.test.mjs
import assert from 'node:assert/strict'
import { computeMilestonePayment, toPaise } from './money.js'

// ₹10,000 milestone, 60/40 split
let r = computeMilestonePayment(10000, [{ user_id: 'a', percent: 60 }, { user_id: 'b', percent: 40 }])
assert.equal(r.milestone, 1000000)
assert.equal(r.clientFee, 50000)        // 5%
assert.equal(r.total, 1050000)          // client pays ₹10,500
assert.equal(r.teamCommission, 80000)   // 8%
assert.deepEqual(r.payouts.map((p) => p.amount), [552000, 368000]) // ₹5,520 + ₹3,680 = ₹9,200

// Awkward amount + 3-way split: payouts must sum to the pool exactly, never more or less
r = computeMilestonePayment(999.99, [{ user_id: 'a', percent: 33 }, { user_id: 'b', percent: 33 }, { user_id: 'c', percent: 34 }])
const pool = r.milestone - r.teamCommission
assert.equal(r.payouts.reduce((s, p) => s + p.amount, 0), pool)
assert.equal(r.total - pool, r.clientFee + r.teamCommission) // platform keeps exactly fee + commission
assert.ok(r.payouts.every((p) => Number.isInteger(p.amount) && p.amount > 0))

// Exhaustive-ish: sums always exact for many amounts
for (let paise = 100; paise < 200000; paise += 137) {
  const x = computeMilestonePayment(paise / 100, [{ user_id: 'a', percent: 1 }, { user_id: 'b', percent: 49 }, { user_id: 'c', percent: 50 }])
  assert.equal(x.payouts.reduce((s, p) => s + p.amount, 0), x.milestone - x.teamCommission)
}

// Floating-point input is converted exactly
assert.equal(toPaise(10.1), 1010) // 10.1 * 100 is 1009.9999… in floating point
assert.equal(toPaise('1234.56'), 123456)

// Rejects bad input
assert.throws(() => toPaise(0.5))
assert.throws(() => computeMilestonePayment(100, [{ user_id: 'a', percent: 60 }, { user_id: 'b', percent: 30 }]))
assert.throws(() => computeMilestonePayment(100, [{ user_id: 'a', percent: 50.5 }, { user_id: 'b', percent: 49.5 }]))

console.log('money.test: all passed')
