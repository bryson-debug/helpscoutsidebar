export function Loading() {
  return (
    <div className="state state--loading">
      <div className="skeleton-pill" />
      <div className="skeleton-pill" />
      <div className="skeleton-pill" />
    </div>
  )
}

export function NoRecord() {
  return (
    <div className="state">
      <p className="state__message">No Flodesk record found</p>
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
