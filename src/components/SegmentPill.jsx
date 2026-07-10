export default function SegmentPill({ segment, stage, onTapRemove, onCancelStage, disabled }) {
  const isStagedRemove = stage?.type === 'remove' && stage.segmentId === segment.id

  return (
    <span
      className={`pill${isStagedRemove ? ' pill--staged-remove' : ''}`}
      style={{ '--pill-color': segment.color }}
    >
      <span
        className="pill__label"
        onClick={isStagedRemove ? onCancelStage : undefined}
        title={isStagedRemove ? 'Click to cancel' : undefined}
      >
        {segment.name}
      </span>
      <button
        type="button"
        className="pill__remove"
        aria-label={isStagedRemove ? `Confirm remove ${segment.name}` : `Remove ${segment.name}`}
        onClick={() => onTapRemove(segment)}
        disabled={disabled}
      >
        {isStagedRemove ? '✓' : '×'}
      </button>
    </span>
  )
}
