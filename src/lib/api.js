const config = window.__CONFIG__ || {}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.sessionToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const error = new Error(data?.message || data?.error || `Request failed: ${res.status}`)
    error.status = res.status
    error.data = data
    throw error
  }
  return data
}

export function lookupSubscriber({ email, mailboxName, mailboxId }) {
  const params = new URLSearchParams({
    email,
    mailboxName: mailboxName || '',
    mailboxId: mailboxId != null ? String(mailboxId) : '',
  })
  return apiFetch(`/api/flodesk/lookup?${params.toString()}`)
}

export function changeSegment({
  email,
  segmentId,
  segmentName,
  action,
  mailboxName,
  mailboxId,
  agentEmail,
  expectedSegmentIds,
}) {
  return apiFetch('/api/flodesk/segments', {
    method: 'POST',
    body: JSON.stringify({
      email,
      segmentId,
      segmentName,
      action,
      mailboxName,
      mailboxId,
      agentEmail,
      expectedSegmentIds,
    }),
  })
}

export const clientConfig = config
