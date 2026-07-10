import jwt from 'jsonwebtoken'

const TTL_SECONDS = 60 * 30

// Minted by api/app.js once the initial HelpScout signature check passes,
// then used by the iframe's own JS to authorize its calls to our /api/flodesk/*
// routes. This is our own auth boundary — independent of HelpScout's signature
// scheme — so the add/remove/lookup endpoints aren't callable by anyone who
// simply guesses the URL.
export function mintSessionToken({ conversationId, secret }) {
  return jwt.sign({ conversationId }, secret, { expiresIn: TTL_SECONDS })
}

export function verifySessionToken(token, secret) {
  try {
    return jwt.verify(token, secret)
  } catch {
    return null
  }
}
