import crypto from 'node:crypto'

// Confirmed against a live request (see developer.helpscout.com/apps/guides/
// signature-validation, matching HelpScout's own PHP example): the signature
// arrives as a query param named `X-HelpScout-Signature`, computed as
// base64(HMAC-SHA1(secret, JSON.stringify(all other request params, in
// their original order))).
export function verifyHelpScoutSignature({ secret, params }) {
  if (!secret) throw new Error('HELPSCOUT_APP_SECRET is not configured')

  const signature = params['X-HelpScout-Signature']
  if (!signature) return false

  const data = { ...params }
  delete data['X-HelpScout-Signature']

  const expected = crypto.createHmac('sha1', secret).update(JSON.stringify(data), 'utf8').digest('base64')

  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(signature)
  if (expectedBuf.length !== actualBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, actualBuf)
}
