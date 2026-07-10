// NOTE: Flodesk's exact subscriber-profile URL format wasn't confirmed
// against live docs/UI. Verify this during the credentials walkthrough
// (open the subscriber in the Flodesk web app and compare) and adjust.
export function flodeskProfileUrl(subscriber) {
  if (!subscriber?.id) return null
  return `https://app.flodesk.com/audience/subscribers/${subscriber.id}`
}
