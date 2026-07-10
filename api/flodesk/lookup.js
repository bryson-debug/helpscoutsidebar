import { requireSession } from '../../lib/requireSession.js'
import { assertAllowedMailbox } from '../../lib/mailboxGuard.js'
import { getSubscriberByEmail, listAllSegments } from '../../lib/flodeskClient.js'
import { cacheGet, cacheSet, SUBSCRIBER_TTL_MS, SEGMENT_LIST_TTL_MS } from '../../lib/cache.js'
import { colorForSegment } from '../../lib/colors.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end()
    return
  }

  if (!requireSession(req, res)) return

  const { email, mailboxName, mailboxId } = req.query
  if (!email) {
    res.status(400).json({ error: 'email is required' })
    return
  }

  if (!assertAllowedMailbox({ mailboxName, mailboxId })) {
    res.status(403).json({ error: 'This app is only enabled for the Tarbet Education Network mailbox.' })
    return
  }

  const apiKey = process.env.FLODESK_API_KEY
  const subscriberCacheKey = `subscriber:${email}`

  try {
    let subscriber = cacheGet(subscriberCacheKey)
    if (subscriber === undefined) {
      subscriber = await getSubscriberByEmail(apiKey, email)
      cacheSet(subscriberCacheKey, subscriber, SUBSCRIBER_TTL_MS)
    }

    let allSegments = cacheGet('segments:all')
    if (allSegments === undefined) {
      allSegments = await listAllSegments(apiKey)
      cacheSet('segments:all', allSegments, SEGMENT_LIST_TTL_MS)
    }

    const coloredAllSegments = allSegments.map((s) => ({ ...s, color: colorForSegment(s) }))
    const colorById = new Map(coloredAllSegments.map((s) => [s.id, s.color]))
    const coloredSubscriber = subscriber && {
      ...subscriber,
      segments: (subscriber.segments ?? []).map((s) => ({
        ...s,
        color: colorById.get(s.id) ?? colorForSegment(s),
      })),
    }

    res.status(200).json({ subscriber: coloredSubscriber, allSegments: coloredAllSegments })
  } catch (err) {
    res.status(502).json({ error: 'Flodesk lookup failed', detail: err.message })
  }
}
