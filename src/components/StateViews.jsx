export function Loading() {
  return (
    <div className="state state--loading">
      <div className="skeleton-pill" />
      <div className="skeleton-pill" />
      <div className="skeleton-pill" />
    </div>
  )
}

export function NoRecord({ debug }) {
  return (
    <div className="state">
      <p className="state__message">No Flodesk record found</p>
      {debug && (
        <pre style={{ fontSize: 10, whiteSpace: 'pre-wrap', color: '#9ca3af' }}>
          {debug.status}: {debug.body}
        </pre>
      )}
    </div>
  )
}

export function ErrorState({ onRetry }) {
  return (
    <div className="state">
      <p className="state__message state__message--error">Flodesk lookup failed</p>
      <button type="button" className="button button--secondary" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

export function MailboxBlocked() {
  return (
    <div className="state">
      <p className="state__message">This app is only enabled for the Tarbet Education Network mailbox.</p>
    </div>
  )
}
