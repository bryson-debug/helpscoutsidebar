// Mirrors lib/colors.js. Used client-side only as a fallback when merging a
// segment that isn't present in the already-fetched allSegments list (which
// carries server-assigned colors from the initial lookup).
const PALETTE = [
  '#F26B6B', '#F2A65A', '#F2D06B', '#8BC48A', '#5AA9A3',
  '#5A8DEE', '#8A6BF2', '#C46BC4', '#6B7280', '#2E9E8F',
]

export function colorForSegment(segment) {
  if (segment.color) return segment.color
  const hash = [...segment.name].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return PALETTE[hash % PALETTE.length]
}
