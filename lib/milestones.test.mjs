// Run: node lib/milestones.test.mjs
import assert from 'node:assert/strict'
import { canMoveMilestone } from './milestones.js'

const owner = { isOwner: true, isTeamMember: false }
const team = { isOwner: false, isTeamMember: true }
const stranger = { isOwner: false, isTeamMember: false }
const STATUSES = ['pending', 'submitted', 'approved', 'paid', 'disputed', 'refunded']

// The only moves allowed, per role
const allowed = {
  owner: ['submitted>pending', 'submitted>approved', 'submitted>disputed', 'approved>disputed'],
  team: ['pending>submitted', 'submitted>disputed', 'approved>disputed'],
  stranger: [],
}
for (const [name, who] of [['owner', owner], ['team', team], ['stranger', stranger]]) {
  for (const from of STATUSES) for (const to of STATUSES) {
    assert.equal(canMoveMilestone(from, to, who), allowed[name].includes(`${from}>${to}`), `${name}: ${from} > ${to}`)
  }
}

// Only the client can dispute an unsubmitted milestone, and only once it's funded
assert.equal(canMoveMilestone('pending', 'disputed', { ...owner, funded: true }), true)
assert.equal(canMoveMilestone('pending', 'disputed', { ...team, funded: true }), false)

// The money states are never reachable by a user, whatever the role
for (const who of [owner, team]) for (const from of STATUSES) {
  assert.equal(canMoveMilestone(from, 'paid', who), false)
  assert.equal(canMoveMilestone(from, 'refunded', who), false)
}

console.log('milestones.test: all passed')
