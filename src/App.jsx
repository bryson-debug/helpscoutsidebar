import { useCallback, useEffect, useRef, useState } from 'react'
import HelpScout, { getPrimaryEmail } from './lib/helpscoutSdk.js'
import { lookupSubscriber, changeSegment, clientConfig } from './lib/api.js'
import { colorForSegment } from './lib/colors.js'
import { flodeskProfileUrl } from './lib/flodeskProfileUrl.js'
import SegmentPill from './components/SegmentPill.jsx'
import AddSegmentTypeahead from './components/AddSegmentTypeahead.jsx'
import StatusBadge from './components/StatusBadge.jsx'
import { Loading, NoRecord, ErrorState, MailboxBlocked } from './components/StateViews.jsx'

const SHOW_LIMIT = 8

function parseList(value) {
  return (value || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
}

function isAllowedMailbox(mailbox) {
  const { allowedMailboxId, allowedMailboxName } = clientConfig
  if (!mailbox) return true
  const allowedIds = parseList(allowedMailboxId)
  const allowedNames = parseList(allowedMailboxName)
  if (!allowedIds.length && !allowedNames.length) return true
  const idMatch = allowedIds.length > 0 && allowedIds.includes(String(mailbox.id))
  const nameMatch = allowedNames.length > 0 && allowedNames.includes(mailbox.name)
  return idMatch || nameMatch
}

export default function App() {
  const [phase, setPhase] = useState('loading')
  const [subscriber, setSubscriber] = useState(null)
  const [allSegments, setAllSegments] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [stage, setStage] = useState(null)
  const [committing, setCommitting] = useState(false)
  const [banner, setBanner] = useState(null)
  const identityRef = useRef({})
  const rootRef = useRef(null)

  const load = useCallback(async () => {
    setPhase('loading')
    setBanner(null)
    try {
      const context = await HelpScout.getApplicationContext()
      const mailbox = context.mailbox
      identityRef.current = {
        agentEmail: context.user?.email,
        conversationId: context.conversation?.id,
        mailboxName: mailbox?.name,
        mailboxId: mailbox?.id,
      }

      if (!isAllowedMailbox(mailbox)) {
        setPhase('mailbox-blocked')
        return
      }

      const email = getPrimaryEmail(context)
      identityRef.current.email = email
      if (!email) {
        setPhase('no-record')
        return
      }

      const { subscriber, allSegments } = await lookupSubscriber({
        email,
        mailboxName: mailbox?.name,
        mailboxId: mailbox?.id,
      })

      setAllSegments(allSegments)
      if (!subscriber) {
        setPhase('no-record')
        return
      }
      setSubscriber(subscriber)
      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Re-attach only when `phase` changes the mounted DOM node (loading/error/
  // etc. render a different element without rootRef) — NOT on every render,
  // which previously recreated the observer so often that its pending
  // "size changed" callback could get cancelled before ever firing,
  // silently under-reporting the app's height. That got worse the more
  // segments a subscriber had, since more segments means more re-renders
  // while data loads — ResizeObserver itself already reacts to every actual
  // size change on its own, so it only needs to be created once per mount.
  useEffect(() => {
    if (!rootRef.current) return

    // The pill list sits right at a width where 1 vs 2 pills fit per row.
    // HelpScout's own sidebar column (all stacked apps combined) picks up a
    // scrollbar once its total height passes a threshold, which shaves a
    // few pixels off every app's available width — including ours — which
    // is just enough to flip our pill wrapping, which changes our height,
    // which can flip that scrollbar back off, and so on: a feedback loop
    // between our report and HelpScout's own layout that shows up as a
    // continuous twitch between a compact and an expanded layout. We can't
    // control HelpScout's side of that loop, so instead we make our own
    // reporting asymmetric: growing is reported right away (never clip
    // content), but shrinking only gets reported once the smaller size has
    // actually held for a while — long enough to outlast one oscillation
    // cycle. A transient dip caused by the loop gets superseded by the next
    // grow before its shrink timer ever fires, so the loop can't sustain
    // itself; a genuine shrink (segments actually removed) still reports
    // once things settle down.
    let pendingShrink = null
    let lastReported = null

    const report = (height) => {
      lastReported = height
      HelpScout.setAppHeight(height)
    }

    const observer = new ResizeObserver(() => {
      const height = rootRef.current.scrollHeight
      if (lastReported === null || height >= lastReported) {
        clearTimeout(pendingShrink)
        pendingShrink = null
        report(height)
        return
      }
      clearTimeout(pendingShrink)
      pendingShrink = setTimeout(() => report(height), 2000)
    })
    observer.observe(rootRef.current)
    return () => {
      clearTimeout(pendingShrink)
      observer.disconnect()
    }
  }, [phase])

  const currentSegments = subscriber?.segments ?? []
  const sortedSegments = [...currentSegments].sort((a, b) => a.name.localeCompare(b.name))
  const visibleSegments = showAll ? sortedSegments : sortedSegments.slice(0, SHOW_LIMIT)
  const currentSegmentIds = new Set(currentSegments.map((s) => s.id))

  function tapRemove(segment) {
    if (committing) return
    if (stage?.type === 'remove' && stage.segmentId === segment.id) {
      commit({ type: 'remove', segmentId: segment.id, segmentName: segment.name })
    } else {
      setStage({ type: 'remove', segmentId: segment.id, segmentName: segment.name })
    }
  }

  function selectAdd(segment) {
    if (committing) return
    setStage({ type: 'add', segmentId: segment.id, segmentName: segment.name })
  }

  function cancelStage() {
    setStage(null)
  }

  async function commit(action) {
    setCommitting(true)
    setBanner(null)
    try {
      const { email, agentEmail, mailboxName, mailboxId, conversationId } = identityRef.current
      const result = await changeSegment({
        email,
        segmentId: action.segmentId,
        segmentName: action.segmentName,
        action: action.type,
        mailboxName,
        mailboxId,
        agentEmail,
        conversationId,
        expectedSegmentIds: currentSegments.map((s) => s.id),
      })
      setSubscriber(result.subscriber)
      setStage(null)
    } catch (err) {
      if (err.status === 409) {
        setSubscriber(err.data.subscriber)
        setBanner({ type: 'warning', text: err.data.message })
        setStage(null)
      } else if (err.status === 429) {
        setBanner({ type: 'warning', text: err.data.message })
      } else {
        setBanner({ type: 'error', text: 'That change failed. Please try again.' })
      }
    } finally {
      setCommitting(false)
    }
  }

  if (phase === 'loading') return <Loading />
  if (phase === 'mailbox-blocked') return <MailboxBlocked />
  if (phase === 'error') return <ErrorState onRetry={load} />

  const profileUrl = flodeskProfileUrl(subscriber)

  return (
    <div className="sidebar" ref={rootRef}>
      {banner && <div className={`banner banner--${banner.type}`}>{banner.text}</div>}

      {phase === 'no-record' && <NoRecord />}

      {phase === 'ready' && (
        <>
          {sortedSegments.length === 0 && <p className="empty-note">No segments yet</p>}

          <div className="pill-list">
            <StatusBadge status={subscriber?.status} />

            {visibleSegments.map((segment) => (
              <SegmentPill
                key={segment.id}
                segment={{ ...segment, color: segment.color ?? colorForSegment(segment) }}
                stage={stage}
                disabled={committing}
                onTapRemove={tapRemove}
                onCancelStage={cancelStage}
              />
            ))}

            {stage?.type === 'add' && (
              <span className="pill pill--staged-add">
                <span className="pill__label">{stage.segmentName}</span>
                <button
                  type="button"
                  className="pill__remove"
                  aria-label={`Confirm add ${stage.segmentName}`}
                  disabled={committing}
                  onClick={() => commit(stage)}
                >
                  ✓
                </button>
                <button
                  type="button"
                  className="pill__remove"
                  aria-label="Cancel add"
                  disabled={committing}
                  onClick={cancelStage}
                >
                  ×
                </button>
              </span>
            )}
          </div>

          {sortedSegments.length > SHOW_LIMIT && (
            <button type="button" className="show-more" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show less' : `Show more (${sortedSegments.length - SHOW_LIMIT})`}
            </button>
          )}

          {stage?.type === 'add' && (
            <p className="automation-warning">
              ⚠ Adding this segment may trigger an automated email to the customer.
            </p>
          )}

          <AddSegmentTypeahead
            allSegments={allSegments}
            currentSegmentIds={currentSegmentIds}
            onSelect={selectAdd}
            disabled={committing}
          />

          {profileUrl && (
            <a className="button button--flodesk" href={profileUrl} target="_blank" rel="noreferrer">
              View in Flodesk
            </a>
          )}
        </>
      )}
    </div>
  )
}
