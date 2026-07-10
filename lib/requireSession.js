import { verifySessionToken } from './sessionToken.js'

export function requireSession(req, res) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const payload = token && verifySessionToken(token, process.env.SESSION_TOKEN_SECRET)
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session' })
    return null
  }
  return payload
}
