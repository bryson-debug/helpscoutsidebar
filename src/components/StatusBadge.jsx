const STATUS_META = {
  active: { label: 'Subscribed', className: 'status-badge--active', hint: 'Currently active to receive marketing emails.' },
  unsubscribed: { label: 'Unsubscribed', className: 'status-badge--unsubscribed', hint: 'Opted out of marketing emails.' },
  unconfirmed: { label: 'Unconfirmed', className: 'status-badge--unconfirmed', hint: 'Pending double opt-in confirmation.' },
  bounced: { label: 'Bounced', className: 'status-badge--bounced', hint: "Address is undeliverable due to a hard bounce." },
  complained: { label: 'Complained', className: 'status-badge--complained', hint: 'Marked an email as spam.' },
  cleaned: { label: 'Cleaned', className: 'status-badge--cleaned', hint: 'Removed from sending for deliverability reasons.' },
}

export default function StatusBadge({ status }) {
  if (!status) return null
  const meta = STATUS_META[status] ?? { label: status, className: 'status-badge--unknown', hint: '' }
  return (
    <span className={`status-badge ${meta.className}`} title={meta.hint}>
      {meta.label}
    </span>
  )
}
