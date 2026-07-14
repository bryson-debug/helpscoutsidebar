# HelpScout ↔ Flodesk Sidebar

Support-tooling sidebar app for HelpScout: shows a customer's Flodesk segments inline in the conversation, with add/remove that writes back to Flodesk.

Built against `HelpScoutFlodeskSidebarSpec.md`. Originally scoped to Tarbet Education Network only; later enabled on That Music Teacher as well, since both mailboxes share the same Flodesk account. Only install on mailboxes whose customers are actually represented in that Flodesk account.

## Architecture

- **Frontend**: React (Vite), served as a fully custom iframe app via HelpScout's [App Developer Platform](https://developer.helpscout.com/apps/) — not the legacy static/JSON "Dynamic App" content blocks, which strip JS and can't support the two-tap stage/confirm, typeahead, or inline pill removal this spec needs.
- **Backend**: Vercel serverless functions under `/api`.
  - `api/app.js` — the HelpScout "Content URL". Verifies `X-HelpScout-Signature` (a query param — confirmed live: `base64(HMAC-SHA1(secret, JSON.stringify(other params, original order)))`, per `lib/helpscoutSignature.js`), then serves the HTML shell with a short-lived session token embedded.
  - `api/flodesk/lookup.js` — subscriber + segment lookup (session-token authed).
  - `api/flodesk/segments.js` — add/remove segment (session-token authed, rate-limited, stale-write checked, audit-logged).
- **Auth model**: HelpScout's signature only covers the initial iframe load. The iframe's own JS calls back to `/api/flodesk/*` using a separate short-lived JWT (`SESSION_TOKEN_SECRET`) minted at that initial load — this is what actually gates the lookup/write endpoints.
- **Mailbox restriction**: enforced twice — (1) which mailbox(es) the app is enabled on in HelpScout's Manage > Apps UI, and (2) `lib/mailboxGuard.js` rejects requests server-side if the mailbox doesn't match `ALLOWED_MAILBOX_ID`/`ALLOWED_MAILBOX_NAME`, as a defense-in-depth backstop. Both env vars accept multiple values separated by `|` (not comma, since mailbox names can contain commas) — a request passes if it matches any listed ID or any listed name.

## Setup

```
npm install
cp .env.example .env   # fill in during the credentials walkthrough
npm run build
```

Required env vars — see `.env.example`. All must be set in Vercel's project settings for the deployment, never hardcoded.

## Resolved during the build/walkthrough

Confirmed against the real Flodesk OpenAPI spec, the Flodesk web app, and live requests:
- HelpScout's signature shape and query param names (`conversation-id`, `customer-id`, `mailbox-id`, `user-id`, etc.) — confirmed against a real request. Numeric mailbox IDs: Tarbet Education Network = `364558`, That Music Teacher = `317821` (note: the real mailbox name has no ", LLC" suffix, despite that being how it's referred to conversationally).
- Flodesk's segment add/remove endpoints (`POST`/`DELETE /v1/subscribers/{id_or_email}/segments`, body `{segment_ids: [...]}`) — both confirmed correct as originally implemented.
- Flodesk rate limits: **100 requests/minute per endpoint** (lower, 20/min, for the batch subscriber endpoint specifically, which this app doesn't use) — comfortably covered by the 60s cache.
- Flodesk requires a `User-Agent` header on every request (shown in all their curl examples) — added to `lib/flodeskClient.js`.
- `GET /v1/segments` is paginated (max 100/page) — `listAllSegments` now loops through all pages so the add-segment typeahead never silently misses segments beyond the first page.
- Flodesk's router doesn't decode a percent-encoded `@` (`%40`) back to the literal character for `/subscribers/{id_or_email}` — a fully URL-encoded email 404s even for a real, active subscriber, while the same email with a literal `@` succeeds. This was the actual cause of every "no record found" false negative during testing. Fixed via `encodeEmailForPath()` in `lib/flodeskClient.js`, which encodes everything except `@`.
- Flodesk subscriber profile URL (`src/lib/flodeskProfileUrl.js`) — confirmed as `https://app.flodesk.com/subscriber/{id}/overview` against a real profile page.

## Testing

Per spec §10: test against Bryson's own email as the "customer" before rolling out to Bri and Noemi. Confirm each state (loading, no-record, error+retry, overflow at 10+ segments, add/remove/stale/rate-limit) as described in the spec.
