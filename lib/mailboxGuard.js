// Belt-and-suspenders check: the primary restriction is which mailbox(es)
// the app is enabled on in HelpScout's Manage > Apps UI. This is a second,
// server-side guard in case the app is ever accidentally enabled elsewhere.
// ALLOWED_MAILBOX_ID/ALLOWED_MAILBOX_NAME may each hold multiple values
// separated by `|` (mailbox names can contain commas, e.g. "That Music
// Teacher, LLC", so comma can't be the separator). A mailbox is allowed if
// it matches EITHER list — this lets you mix known IDs for some mailboxes
// with name-only entries for mailboxes whose ID isn't confirmed yet.
function parseList(value) {
  return (value || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function assertAllowedMailbox({ mailboxName, mailboxId }) {
  const allowedIds = parseList(process.env.ALLOWED_MAILBOX_ID)
  const allowedNames = parseList(process.env.ALLOWED_MAILBOX_NAME)

  if (!allowedIds.length && !allowedNames.length) return true

  const idMatch = allowedIds.length > 0 && allowedIds.includes(String(mailboxId))
  const nameMatch = allowedNames.length > 0 && allowedNames.includes(mailboxName)
  return idMatch || nameMatch
}
