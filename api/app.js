import { verifyHelpScoutSignature } from '../lib/helpscoutSignature.js'
import { mintSessionToken } from '../lib/sessionToken.js'
import { renderShell } from '../lib/renderShell.js'

// This is the "Content URL" registered with HelpScout's app (Manage > Apps).
// HelpScout iframes this URL directly in the conversation sidebar, appending
// query params (conversation-id, customer-id, mailbox-id, user-id, plus
// platform ids) and a signature over them.
export default async function handler(req, res) {
  try {
    const query = req.query || {}

    const verified = verifyHelpScoutSignature({
      secret: process.env.HELPSCOUT_APP_SECRET,
      params: query,
    })

    if (!verified) {
      res.status(401).send('Invalid signature')
      return
    }

    const conversationId = query['conversation-id'] ?? null

    const sessionToken = mintSessionToken({
      conversationId,
      secret: process.env.SESSION_TOKEN_SECRET,
    })

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(
      renderShell({
        sessionToken,
        allowedMailboxName: process.env.ALLOWED_MAILBOX_NAME || null,
        allowedMailboxId: process.env.ALLOWED_MAILBOX_ID || null,
      })
    )
  } catch (err) {
    console.error('api/app crashed', err)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.status(500).send(`Config error: ${err.message}`)
  }
}
