import HelpScout from '@helpscout/javascript-sdk'

export default HelpScout

// Per spec 3.3: match on primary email only. `Context.customer.emails` (the
// Mailbox-API-shaped object) carries no "primary" flag — only
// `Context.conversation.customers[].emails[].default` does — so the primary
// email must be read off the conversation, not the top-level customer.
export function getPrimaryEmail(context) {
  const conversation = context.conversation
  if (!conversation) return null
  const customer = conversation.customers?.find((c) => c.id === conversation.customerId)
  const primary = customer?.emails?.find((e) => e.default) ?? customer?.emails?.[0]
  return primary?.value ?? null
}
