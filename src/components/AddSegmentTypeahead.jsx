import { useMemo, useState } from 'react'

export default function AddSegmentTypeahead({ allSegments, currentSegmentIds, onSelect, disabled }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    return allSegments
      .filter((s) => !currentSegmentIds.has(s.id) && s.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, allSegments, currentSegmentIds])

  return (
    <div className="typeahead">
      <input
        type="text"
        className="typeahead__input"
        placeholder="Add a segment…"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <ul className="typeahead__list">
          {matches.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="typeahead__option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(s)
                  setQuery('')
                  setOpen(false)
                }}
              >
                <span className="typeahead__swatch" style={{ background: s.color }} />
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
