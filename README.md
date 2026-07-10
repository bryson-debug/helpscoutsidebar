# HelpScout ↔ Flodesk Sidebar

Support-tooling sidebar app for the **Tarbet Education Network** HelpScout mailbox: shows a customer's Flodesk segments inline in the conversation, with add/remove that writes back to Flodesk.

Built against `HelpScoutFlodeskSidebarSpec.md`. This app is scoped to Tarbet Education Network only — it must never be installed on the That Music Teacher, LLC mailbox.

## Architecture

- **Frontend**: React (Vite), served as a fully custom iframe app via HelpScout's [App Developer Platform](https://developer.helpscout.com/apps/) — not the legacy static/JSON "Dynamic App" content blocks, which strip JS and can't support the two-tap stage/confirm, typeahead, or inline pill removal this spec needs.
- **Backend**: Vercel serverless functions under `/api`.
  - `api/app.js` — the HelpScout "Callback URL". Verifies `X-HelpScout-Signature` (HMAC-SHA1 with the app's Secret Key), then serves the HTML shell with a short-lived session token embedded.
  - `api/flodesk/lookup.js` — subscriber + segment lookup (session-token authed).
  - `api/flodesk/segments.js` — add/remove segment (session-token authed, rate-limited, stale-write checked, audit-logged).
- **Auth model**: HelpScout's signature only covers the initial iframe load. The iframe's own JS calls back to `/api/flodesk/*` using a separate short-lived JWT (`SESSION_TOKEN_SECRET`) minted at that initial load — this is what actually gates the lookup/write endpoints.
- **Mailbox restriction**: enforced twice — (1) the app should only be installed on the Tarbet Education Network mailbox in HelpScout's Manage > Apps UI, and (2) `lib/mailboxGuard.js` rejects requests server-side if the mailbox doesn't match `ALLOWED_MAILBOX_ID`/`ALLOWED_MAILBOX_NAME`, as a defense-in-depth backstop.

## Setup

```
npm install
cp .env.example .env   # fill in during the credentials walkthrough
npm run build
```

Required env vars — see `.env.example`. All must be set in Vercel's project settings for the deployment, never hardcoded.

## Open items to confirm live (see spec §12)

These couldn't be verified against live docs while building (see comments at each call site) — confirm during the credentials walkthrough before going live:

1. **Flodesk segment removal endpoint** (`lib/flodeskClient.js`) — implemented as the symmetric `DELETE /v1/subscribers/{email}/segments` counterpart to the documented add endpoint; not independently confirmed.
2. **Flodesk rate limits** — no published number found; the spec's 60s cache is a reasonable safety margin regardless.
3. **Flodesk subscriber profile URL** (`src/lib/flodeskProfileUrl.js`) — "View in Flodesk" link format is a best guess; compare against a real subscriber page in the Flodesk web app.
4. **HelpScout callback query params** (`api/app.js`) — the conversation ID param name on the initial signed request is a guess; the frontend's `getApplicationContext()` call is the authoritative source either way, so this only affects an audit-log fallback value.
5. **HelpScout signature shape** (`lib/helpscoutSignature.js`) — verifies both a body-based and query-based HMAC since it wasn't confirmed which the current platform sends; drop the unused branch once confirmed.

## Testing

Per spec §10: test against Bryson's own email as the "customer" before rolling out to Bri and Noemi. Confirm each state (loading, no-record, error+retry, overflow at 10+ segments, add/remove/stale/rate-limit) as described in the spec.
