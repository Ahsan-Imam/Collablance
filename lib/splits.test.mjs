// Run: node lib/splits.test.mjs
import assert from 'node:assert/strict'
import { toWholePercents } from './splits.js'

const sum = (a) => a.reduce((s, x) => s + x, 0)

assert.deepEqual(toWholePercents([1]), [100])
assert.deepEqual(toWholePercents([1, 1]), [50, 50])
assert.deepEqual(toWholePercents([40, 40, 20]), [40, 40, 20])
assert.equal(sum(toWholePercents([1, 1, 1])), 100) // 34/33/33, never 99
assert.deepEqual(toWholePercents([1, 1, 1]).sort(), [33, 33, 34])
// A tiny weight still gets at least 1%
assert.deepEqual(toWholePercents([1000, 0.001]), [99, 1])

// Always whole, >= 1, total 100 — for any weights
let seed = 7
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
for (let run = 0; run < 2000; run++) {
  const n = 1 + Math.floor(rand() * 12)
  const p = toWholePercents(Array.from({ length: n }, () => rand() * 1000 + 0.0001))
  assert.equal(sum(p), 100)
  assert.ok(p.every((x) => Number.isInteger(x) && x >= 1))
}

assert.throws(() => toWholePercents([]))
assert.throws(() => toWholePercents([1, 0]))
assert.throws(() => toWholePercents([1, -5]))
assert.throws(() => toWholePercents([1, NaN]))
assert.throws(() => toWholePercents(Array(101).fill(1)))

console.log('splits.test: all passed')
