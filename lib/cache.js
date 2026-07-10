// Process-local in-memory cache. Vercel serverless functions can cold-start
// between invocations, so this is a best-effort optimization (fewer Flodesk
// calls while a function instance stays warm) rather than a guarantee — per
// spec, correctness never depends on the cache being warm.
const store = new Map()

export function cacheGet(key) {
  const entry = store.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return undefined
  }
  return entry.value
}

export function cacheSet(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function cacheDelete(key) {
  store.delete(key)
}

export const SUBSCRIBER_TTL_MS = 60 * 1000
export const SEGMENT_LIST_TTL_MS = 10 * 60 * 1000
