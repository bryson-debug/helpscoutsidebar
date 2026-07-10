// Confirmed live against a real subscriber page in the Flodesk web app.
export function flodeskProfileUrl(subscriber) {
  if (!subscriber?.id) return null
  return `https://app.flodesk.com/subscriber/${subscriber.id}/overview`
}
