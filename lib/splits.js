// Turn any positive weights into whole-number percentages that total exactly
// 100, each at least 1 — the shape a payout split must have. Largest-remainder
// rounding, so nobody gains or loses more than a point to rounding.
export function toWholePercents(weights) {
  if (!weights.length || weights.length > 100 || !weights.every((w) => Number.isFinite(w) && w > 0)) {
    throw new Error('Weights must be positive numbers, one per member (max 100 members)')
  }
  const total = weights.reduce((sum, w) => sum + w, 0)
  // Everyone gets 1 first; the other (100 - n) points are shared by weight
  const spare = 100 - weights.length
  const exact = weights.map((w) => (w / total) * spare)
  const percents = exact.map((x) => 1 + Math.floor(x))
  let left = 100 - percents.reduce((sum, p) => sum + p, 0)
  const byRemainder = exact.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0])
  for (const [, i] of byRemainder) {
    if (left-- <= 0) break
    percents[i] += 1
  }
  return percents
}
