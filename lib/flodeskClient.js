const BASE_URL = 'https://api.flodesk.com/v1'

function authHeader(apiKey) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`
}

async function request(apiKey, path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(apiKey),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const error = new Error(`Flodesk API ${options.method || 'GET'} ${path} failed: ${res.status} ${body}`)
    error.status = res.status
    throw error
  }
  if (res.status === 204) return null
  return res.json()
}

// GET /v1/subscribers/{email}. Returns null (not thrown) on 404 so callers
// can render the "no Flodesk record found" state.
export async function getSubscriberByEmail(apiKey, email) {
  try {
    return await request(apiKey, `/subscribers/${encodeURIComponent(email)}`)
  } catch (err) {
    if (err.status === 404) return null
    throw err
  }
}

export async function listAllSegments(apiKey) {
  const data = await request(apiKey, '/segments')
  return Array.isArray(data) ? data : data.data ?? []
}

export async function addSubscriberToSegments(apiKey, email, segmentIds) {
  return request(apiKey, `/subscribers/${encodeURIComponent(email)}/segments`, {
    method: 'POST',
    body: JSON.stringify({ segment_ids: segmentIds }),
  })
}

// NOTE: Flodesk's exact removal endpoint/method was not confirmed against
// live docs (developers.flodesk.com was unreachable while building this).
// Implemented as the symmetric counterpart to addSubscriberToSegments —
// verify against a real API call during the credentials walkthrough and
// adjust method/path/body here if it differs.
export async function removeSubscriberFromSegments(apiKey, email, segmentIds) {
  return request(apiKey, `/subscribers/${encodeURIComponent(email)}/segments`, {
    method: 'DELETE',
    body: JSON.stringify({ segment_ids: segmentIds }),
  })
}
