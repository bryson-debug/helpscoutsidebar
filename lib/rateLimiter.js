import { cacheGet, cacheSet } from './cache.js'

const WINDOW_MS = 3 * 1000

// Max 1 write (add/remove) per 3 seconds, keyed by subscriber email — guards
// against accidental double-taps rather than abuse, per spec 5.3.
export function checkWriteRateLimit(email) {
  const key = `ratelimit:${email}`
  const last = cacheGet(key)
  if (last && Date.now() - last < WINDOW_MS) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (Date.now() - last) }
  }
  cacheSet(key, Date.now(), WINDOW_MS)
  return { allowed: true }
}
