// Run: node lib/payments/signature.test.mjs
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { verifyHmac } from './signature.js'

const secret = 'whsec_test'
const body = '{"event":"order.paid","payload":{"order":{"entity":{"id":"order_1"}}}}'
const good = crypto.createHmac('sha256', secret).update(body).digest('hex')

assert.equal(verifyHmac(secret, body, good), true)
assert.equal(verifyHmac(secret, body.replace('order_1', 'order_2'), good), false) // tampered body
assert.equal(verifyHmac('other_secret', body, good), false)
assert.equal(verifyHmac(secret, body, good.slice(0, -1)), false)
assert.equal(verifyHmac(secret, body, null), false)
assert.equal(verifyHmac(secret, body, ''), false)
// A webhook with no secret configured must reject, not accept, everything
assert.equal(verifyHmac(undefined, body, crypto.createHmac('sha256', '').update(body).digest('hex')), false)
assert.equal(verifyHmac('', body, good), false)

console.log('signature.test: all passed')
