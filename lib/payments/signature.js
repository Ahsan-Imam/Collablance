import crypto from 'node:crypto'

// True when signature is the hex HMAC-SHA256 of message under secret.
// No secret → always false, so an unconfigured webhook rejects everything.
export function verifyHmac(secret, message, signature) {
  if (!secret) return false
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(message).digest('hex'))
  const given = Buffer.from(String(signature || ''))
  return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}
