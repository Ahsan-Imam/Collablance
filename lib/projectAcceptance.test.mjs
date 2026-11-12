// Run: node lib/projectAcceptance.test.mjs
import assert from 'node:assert/strict'
import { canMoveProject } from './projectAcceptance.js'

const allowed = { false: ['open', 'cancelled'], true: ['in_progress', 'completed', 'cancelled'] }
for (const accepted of [false, true]) {
  for (const to of ['open', 'in_progress', 'completed', 'cancelled', 'bogus']) {
    assert.equal(canMoveProject(to, accepted), allowed[accepted].includes(to), `accepted=${accepted} > ${to}`)
  }
}

console.log('projectAcceptance.test: all passed')
