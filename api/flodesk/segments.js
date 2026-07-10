import { requireSession } from '../../lib/requireSession.js'
import { assertAllowedMailbox } from '../../lib/mailboxGuard.js'
import {
  getSubscriberByEmail,
  addSubscriberToSegments,
  removeSubscriberFromSegments,
} from '../../lib/flodeskClient.js'
import { cacheSet, cacheDelete, SUBSCRIBER_TTL_MS } from '../../lib/cache.js'
import { checkWriteRateLimit } from '../../lib/rateLimiter.js'
import { appendAuditLogRow } from '../../lib/sheetsLogger.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const session = requireSession(req, res)
  if (!session) return

  const {
    email,
    segmentId,
    segmentName,
    action,
    mailboxName,
    mailboxId,
    agentEmail,
    expectedSegmentIds,
  } = req.body || {}

  if (!email || !segmentId || !['add', 'remove'].includes(action)) {
    res.status(400).json({ error: 'email, segmentId, and action (add|remove) are required' })
    return
  }

  if (!assertAllowedMailbox({ mailboxName, mailboxId })) {
    res.status(403).json({ error: 'This app is only enabled for the Tarbet Education Network mailbox.' })
    return
  }

  const rateLimit = checkWriteRateLimit(email)
  if (!rateLimit.allowed) {
    res.status(429).json({
      error: 'rate_limited',
      message: 'Too many changes in a row — wait a moment and try again.',
      retryAfterMs: rateLimit.retryAfterMs,
    })
    return
  }

  const apiKey = process.env.FLODESK_API_KEY

  try {
    // Stale-write protection (spec 5.2, 5.3): re-check current segment state
    // right before committing, since another agent may have edited this
    // subscriber since the sidebar loaded.
    if (Array.isArray(expectedSegmentIds)) {
      const current = await getSubscriberByEmail(apiKey, email)
      const currentIds = (current?.segments ?? []).map((s) => s.id).sort()
      const expectedIds = [...expectedSegmentIds].sort()
      if (!arraysEqual(currentIds, expectedIds)) {
        res.status(409).json({
          error: 'stale',
          message: 'This subscriber changed since the sidebar loaded. Refresh and try again.',
          subscriber: current,
        })
        return
      }
    }

    if (action === 'add') {
      await addSubscriberToSegments(apiKey, email, [segmentId])
    } else {
      await removeSubscriberFromSegments(apiKey, email, [segmentId])
    }

    cacheDelete(`subscriber:${email}`)

    try {
      await appendAuditLogRow({
        agentEmail: agentEmail || 'unknown',
        customerEmail: email,
        segmentName: segmentName || segmentId,
        action,
        conversationId: session.conversationId || 'unknown',
      })
    } catch (err) {
      console.error('audit log append failed', err)
    }

    const refreshed = await getSubscriberByEmail(apiKey, email)
    cacheSet(`subscriber:${email}`, refreshed, SUBSCRIBER_TTL_MS)

    res.status(200).json({ subscriber: refreshed })
  } catch (err) {
    console.error('api/flodesk/segments crashed', err)
    res.status(502).json({ error: 'Flodesk write failed', detail: err.message })
  }
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}
