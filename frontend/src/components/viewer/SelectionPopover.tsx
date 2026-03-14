import { useEffect, useRef } from 'react'
import { Highlighter, MessageSquarePlus, Copy } from 'lucide-react'

interface SelectionPopoverProps {
  x: number
  y: number
  onHighlight: () => void
  onRemoveHighlight?: (annotationId: string) => void
  matchingHighlightId?: string | null
  onAddNote: () => void
  onCopy: () => void
  onClose: () => void
}

export default function SelectionPopover({
  x,
  y,
  onHighlight,
  onRemoveHighlight,
  matchingHighlightId,
  onAddNote,
  onCopy,
  onClose,
}: SelectionPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="selection-popover"
      style={{
        left: x,
        top: y - 52,
        transform: 'translateX(-50%)',
      }}
    >
      <button
        onClick={
          matchingHighlightId && onRemoveHighlight
            ? () => onRemoveHighlight(matchingHighlightId)
            : onHighlight
        }
        title={matchingHighlightId ? 'Remove highlight' : 'Highlight'}
        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <Highlighter size={13} color="var(--color-accent-warn)" />
        {matchingHighlightId ? 'Remove highlight' : 'Highlight'}
      </button>
      <button
        onClick={onAddNote}
        title="Add Note"
        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <MessageSquarePlus size={13} color="var(--color-accent-info)" />
        Note
      </button>
      <button
        onClick={onCopy}
        title="Copy"
        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <Copy size={13} />
        Copy
      </button>
    </div>
  )
}
