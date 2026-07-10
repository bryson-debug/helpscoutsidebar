import crypto from 'node:crypto'

// HelpScout signs requests with HMAC-SHA1 + base64, using the app's Secret
// Key (from the Manage > Apps registration). The current App Developer
// Platform documents this as a header (`X-HelpScout-Signature`) computed
// over the request body; the legacy Dynamic App mechanism computed it over
// the query string instead. We don't yet have a live app registration to
// confirm which shape this deployment's callback actually receives, so this
// verifies against whichever is present. Confirm against a real request
// during the credentials walkthrough and drop the unused branch.
export function verifyHelpScoutSignature({ secret, headerSignature, rawBody, query }) {
  if (!secret) throw new Error('HELPSCOUT_APP_SECRET is not configured')
  if (!headerSignature) return false

  if (rawBody) {
    const expected = sign(secret, rawBody)
    if (safeEqual(expected, headerSignature)) return true
  }

  if (query) {
    const { 'X-HelpScout-Signature': _sig, signature: _sig2, ...rest } = query
    const sortedQueryString = Object.keys(rest)
      .sort()
      .map((key) => `${key}=${rest[key]}`)
      .join('&')
    const expected = sign(secret, sortedQueryString)
    if (safeEqual(expected, headerSignature)) return true
  }

  return false
}

function sign(secret, payload) {
  return crypto.createHmac('sha1', secret).update(payload, 'utf8').digest('base64')
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
