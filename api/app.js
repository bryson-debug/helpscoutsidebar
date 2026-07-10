import { verifyHelpScoutSignature } from '../lib/helpscoutSignature.js'
import { mintSessionToken } from '../lib/sessionToken.js'
import { renderShell } from '../lib/renderShell.js'

// This is the "Callback URL" registered with HelpScout's app (Manage > Apps).
// HelpScout iframes this URL directly in the conversation sidebar.
export default async function handler(req, res) {
  try {
    const headerSignature = req.headers['x-helpscout-signature']
    const query = req.query || {}

    const verified = verifyHelpScoutSignature({
      secret: process.env.HELPSCOUT_APP_SECRET,
      headerSignature,
      query,
    })

    if (!verified) {
      res.status(401).send('Invalid signature')
      return
    }

    // NOTE: query param name for the conversation ID is unconfirmed — verify
    // against a real callback request during the credentials walkthrough. The
    // frontend also gets the authoritative value from getApplicationContext(),
    // so this is only used to tag the session token if present.
    const conversationId = query.conversationId ?? query.ticketId ?? null

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
