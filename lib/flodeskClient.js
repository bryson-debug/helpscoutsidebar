const BASE_URL = 'https://api.flodesk.com/v1'
const USER_AGENT = 'HelpScout Flodesk Sidebar (helpscoutsidebar.vercel.app)'

function authHeader(apiKey) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`
}

// Flodesk's router doesn't decode a percent-encoded @ (%40) back to the
// literal character for /subscribers/{id_or_email} — a fully-encoded email
// 404s while the same email with a literal @ succeeds (confirmed live).
// Encode everything else normally, then unescape just the @.
function encodeEmailForPath(email) {
  return encodeURIComponent(email).replace(/%40/g, '@')
}

async function request(apiKey, path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(apiKey),
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
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

// GET /v1/subscribers/{id_or_email}. Returns null (not thrown) on 404 so
// callers can render the "no Flodesk record found" state.
export async function getSubscriberByEmail(apiKey, email) {
  try {
    return await request(apiKey, `/subscribers/${encodeEmailForPath(email)}`)
  } catch (err) {
    if (err.status === 404) return null
    throw err
  }
}

// GET /v1/segments is paginated (max 100 per page). Loops until all pages
// are fetched so the add-segment typeahead always sees the full list.
export async function listAllSegments(apiKey) {
  const segments = []
  let page = 1
  let totalPages = 1
  do {
    const res = await request(apiKey, `/segments?page=${page}&per_page=100`)
    segments.push(...(res.data ?? []))
    totalPages = res.meta?.total_pages ?? 1
    page++
  } while (page <= totalPages)
  return segments
}

export async function addSubscriberToSegments(apiKey, email, segmentIds) {
  return request(apiKey, `/subscribers/${encodeEmailForPath(email)}/segments`, {
    method: 'POST',
    body: JSON.stringify({ segment_ids: segmentIds }),
  })
}

export async function removeSubscriberFromSegments(apiKey, email, segmentIds) {
  return request(apiKey, `/subscribers/${encodeEmailForPath(email)}/segments`, {
    method: 'DELETE',
    body: JSON.stringify({ segment_ids: segmentIds }),
  })
}
