// Belt-and-suspenders check: the primary restriction is the mailbox
// selection made when installing the app in HelpScout's Manage > Apps UI
// (Tarbet Education Network only, never That Music Teacher, LLC). This is a
// second, server-side guard in case the app is ever accidentally enabled on
// another mailbox — prefer ALLOWED_MAILBOX_ID (stable) once known; name is a
// fallback for before that's confirmed.
export function assertAllowedMailbox({ mailboxName, mailboxId }) {
  const allowedId = process.env.ALLOWED_MAILBOX_ID
  const allowedName = process.env.ALLOWED_MAILBOX_NAME

  if (allowedId) return String(mailboxId) === String(allowedId)
  if (allowedName) return mailboxName === allowedName
  return true
}
