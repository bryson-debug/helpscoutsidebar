import { google } from 'googleapis'

const SHEET_RANGE = 'A:F'

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

// Appends one row per add/remove action: Timestamp, Agent, Customer email,
// Segment, Action, HelpScout conversation ID. Background-only — never
// surfaced in the sidebar (spec 7). Failures are logged but never block the
// Flodesk write itself from having already succeeded.
export async function appendAuditLogRow({ agentEmail, customerEmail, segmentName, action, conversationId }) {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID is not configured')

  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: SHEET_RANGE,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[new Date().toISOString(), agentEmail, customerEmail, segmentName, action, conversationId]],
    },
  })
}
