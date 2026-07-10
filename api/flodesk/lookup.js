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

    // TEMPORARY: capture Flodesk's raw response when we're about to report
    // "no record found", so we can see the actual status/body instead of
    // guessing why a known-real subscriber isn't matching. Remove once
    // confirmed.
    let debug = null
    if (!subscriber) {
      const authHeaders = {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'User-Agent': 'HelpScout Flodesk Sidebar (helpscoutsidebar.vercel.app)',
      }

      const encodedRes = await fetch(`https://api.flodesk.com/v1/subscribers/${encodeURIComponent(email)}`, {
        headers: authHeaders,
      })
      const encodedBody = await encodedRes.text()

      const rawRes = await fetch(`https://api.flodesk.com/v1/subscribers/${email}`, {
        headers: authHeaders,
      })
      const rawBody = await rawRes.text()

      debug = {
        requestedEmailJson: JSON.stringify(email),
        encodedPathStatus: encodedRes.status,
        encodedPathBody: encodedBody,
        rawPathStatus: rawRes.status,
        rawPathBody: rawBody,
      }
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

    res.status(200).json({ subscriber: coloredSubscriber, allSegments: coloredAllSegments, debug })
  } catch (err) {
    res.status(502).json({ error: 'Flodesk lookup failed', detail: err.message })
  }
}
