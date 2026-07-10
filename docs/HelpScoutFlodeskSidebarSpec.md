# HelpScout ↔ Flodesk Sidebar Integration
### Technical Specification for Build
**Owner:** Bryson, That Music Teacher (TMT)
**Prepared for:** Claude Code build
**Status:** Ready for development
**Priority/Timeline:** ASAP — general support tooling, not tied to a specific event launch

---

## 1. Purpose

Support staff (currently Bri Culliton and Noemi Raya) need to see a customer's current Flodesk segments directly inside a HelpScout conversation, without switching tools. This solves three overlapping support scenarios:

1. **Access disputes** — customer says they paid for/registered for something but can't access it.
2. **Context for replies** — understanding a customer's history (which events, memberships, or lists they're part of) before responding.
3. **Troubleshooting** — diagnosing login/access issues tied to segment membership (e.g. AAP, EDGE™, event-specific tags).

The integration is bidirectional: support can also add or remove segments directly from HelpScout, with those changes writing back live to Flodesk.

---

## 2. Architecture Overview

```
HelpScout Conversation
      │
      │  loads iframe (signed request, HMAC-SHA1)
      ▼
HelpScout Dynamic App (Sidebar)
      │
      │  HTTPS request
      ▼
Vercel Serverless Function  ← [this is what gets built]
      │
      │  Flodesk API calls (read + write)
      ▼
Flodesk Subscriber/Segment API
      │
      │  audit log append
      ▼
Google Sheet (change log)
```

**Components to build:**
- 1 HelpScout Dynamic App registration (via HelpScout Developer portal)
- 1 Vercel project with serverless API route(s)
- 1 Google Sheet for audit logging (Google Drive connector or Sheets API)
- Flodesk API key (read + write scopes)

---

## 3. HelpScout Integration Details

### 3.1 Dynamic App Type
This is a **HelpScout Dynamic App (Sidebar)** — not a static app, since content must be generated per-customer at load time.

### 3.2 Request Verification
Every request HelpScout sends to the backend endpoint includes a signature header. The backend **must** verify this before processing:
- Header: `X-HelpScout-Signature`
- Algorithm: HMAC-SHA1, using the app's secret key (issued at registration)
- Reject/401 any request that fails verification

### 3.3 Trigger/Scope
- **Mailbox scope:** All HelpScout mailboxes (no restriction)
- **Trigger data:** HelpScout passes the customer object on the active conversation, including all emails on file
- **Email used for matching:** **Primary email only** (not secondary/alternate emails)

### 3.4 Response Schema
The endpoint must return JSON matching HelpScout's Dynamic App content block schema. Expected content types needed:
- `text` block — heading ("Flodesk")
- Custom HTML/badge rendering for segment pills (confirm exact supported block types during build — may require `html` block type if supported, or structured text/list blocks)
- `button`/link block — "View in Flodesk" (opens subscriber profile in new tab)
- Interactive elements for add/remove — confirm during build whether HelpScout's Dynamic App spec supports inline interactive actions (buttons that POST back to the endpoint) or whether this requires a workaround (e.g. a lightweight custom web view within the iframe rather than pure HelpScout content blocks). **This is a key open technical question to resolve early in the build**, since it determines whether the add/remove/confirm UX is native HelpScout components or a custom-rendered mini web app inside the sidebar iframe.

---

## 4. Flodesk Integration Details

### 4.1 API Access
- Flodesk API key (read + write scopes) — to be generated during build walkthrough
- Endpoints needed:
  - Look up subscriber by email
  - List subscriber's current segments
  - List all segments in the account (for the add-segment typeahead)
  - Add subscriber to segment
  - Remove subscriber from segment

### 4.2 Segment Color Data
Pills must visually match each segment's actual color as set in Flodesk. Confirm the Flodesk API exposes a color/hex value per segment; if not natively exposed, this may require a fallback (e.g. a maintained color map, or a generated consistent color per segment name as a backup).

### 4.3 Automations Caveat (Important)
Flodesk segments can have automations attached (e.g. adding someone to a segment triggers a welcome email sequence). **The Flodesk API does not expose which segments have automations attached** — this is only visible inside Flodesk's own automation builder UI. Because of this:
- The system cannot show a targeted/specific warning.
- Instead: **show a generic caution note every time an agent adds a segment**, regardless of which segment it is. Example: *"Adding this segment may trigger an automated email to the customer."*

---

## 5. UI / UX Specification

### 5.1 Layout (top to bottom)
1. **Heading:** "Flodesk"
2. **Segment pills** — colored badges matching Flodesk's own segment colors, alphabetically sorted
3. **Overflow handling** — show first 6–8 pills; if more exist, show a "Show more" toggle to expand the rest
4. **Add segment control** — typeahead/search input; agent types to filter existing Flodesk segments, selects one to stage
5. **Remove control** — small "x" on each pill to stage removal
6. **Confirmation step** — inline two-tap pattern:
   - Tap 1: stages the change (visually indicate "pending" state, e.g. dimmed pill or highlighted border)
   - Tap 2 (on same element): commits the change and fires the API write
   - No native browser `confirm()` popups
7. **Automation warning** — small caution icon/note appears near the confirm step whenever an *add* action is staged (not needed for removals)
8. **"View in Flodesk" button** — below the pill list, links directly to the subscriber's profile in Flodesk (opens in new tab)

### 5.2 States to Design For

| State | Display |
|---|---|
| **Loading** | Lightweight loading indicator while the sidebar fetches data (design during build — keep minimal, e.g. skeleton pills or simple spinner) |
| **No subscriber found** | Plain message: "No Flodesk record found" — no additional actions offered |
| **Subscriber found, zero segments** | Show the "Flodesk" heading with an empty state note (e.g. "No segments yet") and still show the add-segment control |
| **API error/timeout** | Distinct message from "no record found" (e.g. "Flodesk lookup failed") + a Retry button |
| **Stale data warning** | If the underlying segment data may have changed since the sidebar loaded (e.g. another agent edited it), show a warning before allowing a commit — re-fetch/compare before finalizing the write |

### 5.3 Interaction Safety
- **Rate limiting:** Max 1 write action (add/remove) per 3 seconds — protects against accidental double-taps/rapid changes.
- **Stale-write protection:** Before committing any add/remove, the backend should re-check the subscriber's current segment state against what was loaded; if it's changed, surface a warning rather than blindly overwriting.

---

## 6. Permissions

- **Who can view:** Anyone with HelpScout access.
- **Who can edit (add/remove segments):** All current HelpScout users (Bri Culliton, Noemi Raya). No role restriction at this time — team is small and trusted.
- Revisit role-based restrictions if the team grows.

---

## 7. Audit Logging

Every add/remove action must be logged for accountability, since these changes affect real subscriber records. Design:

- **Destination:** A dedicated Google Sheet (e.g. "Flodesk Segment Changes")
- **Columns:** Timestamp, Agent name/email, Customer email, Segment name, Action (add/remove), HelpScout conversation ID (for traceability back to the ticket)
- **Trigger:** Vercel function appends a row immediately after a successful write to Flodesk
- No log is shown inline in the HelpScout sidebar — this is a background record only, kept out of the way to preserve a clean UI.

---

## 8. Caching & Performance

- **Cache type:** Short-term in-memory cache on the Vercel function
- **TTL:** 60 seconds
- **Key:** Customer's primary email address
- **Cache invalidation:** Immediately bypass/refresh the cache for a given email right after any write (add/remove) to that subscriber, so the sidebar reflects the change instantly rather than showing stale data for up to 60 seconds.
- **Segment list for typeahead:** Consider a separate, slightly longer-lived cache for the full list of all Flodesk segments (used in the add-segment search), since this changes far less often than individual subscriber data.

---

## 9. Filtering & Sorting

- **Filtering:** None. All segments on the subscriber's Flodesk record are shown — no exclusion list, no keyword filtering.
- **Sort order:** Alphabetical by segment name.

---

## 10. Testing Plan

1. Build against a **test scenario using Bryson's own personal email** as the "customer" — safe to add/remove segments without affecting a real customer record.
2. Confirm:
   - Sidebar loads correctly and matches on primary email
   - Pills render with correct colors and alphabetical order
   - Overflow/"Show more" works correctly at 10+ segments
   - Add flow: typeahead search → stage → confirm → Flodesk updates → audit log row appears
   - Remove flow: same, in reverse
   - No-match state displays correctly (test with an email known not to be in Flodesk)
   - Error state displays correctly (simulate a Flodesk API failure/timeout)
   - Rate limit correctly blocks rapid repeated actions
   - Stale-data warning triggers correctly (test by changing the same subscriber from two different sessions)
3. Once confirmed stable, roll out to Bri and Noemi for live use across all mailboxes.

---

## 11. Credentials & Setup (To Be Completed Together During Build)

The following need to be created before/during development — Bryson has requested a guided walkthrough for these rather than doing them solo:

- [ ] **Flodesk API key** (read + write scopes) — generated from Flodesk account settings
- [ ] **HelpScout Dynamic App registration** — created via HelpScout's Developer/My Apps portal, yields:
  - App secret key (for HMAC-SHA1 signature verification)
  - Content endpoint URL (points to the Vercel deployment)
- [ ] **Vercel project** — new deployment, environment variables for both the Flodesk API key and HelpScout app secret (never hardcoded)
- [ ] **Google Sheet** — created and shared appropriately, with API/service account access configured for the Vercel function to append rows (via Google Sheets API or the Google Drive/Sheets connector)

---

## 12. Open Technical Questions to Resolve at Build Time

These weren't fully resolvable during planning and should be confirmed against current HelpScout/Flodesk API documentation at the start of the build:

1. Does HelpScout's Dynamic App content schema support truly interactive elements (buttons that trigger a follow-up POST request) natively, or does the add/remove/confirm UX need to be built as a custom mini web app rendered inside the sidebar iframe?
2. Does the Flodesk API expose a color/hex value per segment directly, or will pill colors need a fallback approach?
3. Confirm current Flodesk API rate limits to validate the 60-second cache window is sufficient headroom.

---

## Summary Table (Quick Reference)

| Category | Decision |
|---|---|
| Location | HelpScout Dynamic Sidebar App, all mailboxes |
| Heading | "Flodesk" |
| Segment display | Colored pill badges, matching Flodesk's own colors |
| Order | Alphabetical |
| Overflow (10+) | First 6–8 shown, "Show more" toggle |
| Email matching | Primary email only |
| No subscriber found | Plain message, no extra actions |
| API error/timeout | Distinct message + Retry button |
| Add segment | Typeahead search of existing segments only |
| Remove segment | "x" on pill |
| Confirmation | Inline two-tap stage → confirm |
| Automation warning | Generic note on every add |
| Stale-data protection | Warn before commit if data changed |
| Rate limiting | Max 1 change per 3 seconds |
| Permissions | All HelpScout users can view + edit |
| Audit trail | Google Sheet log |
| Profile link | Button below pills, opens Flodesk profile |
| Filtering | None |
| Backend | Vercel serverless function |
| Caching | 60s in-memory, keyed by email, bypassed after writes |
| Testing | Bryson's own email as test subscriber |
| Timeline | ASAP, general support tool |
