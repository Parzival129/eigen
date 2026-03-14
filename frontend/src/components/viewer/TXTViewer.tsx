import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Highlighter,
  MessageSquarePlus,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Minimize2,
  PanelRightOpen,
} from 'lucide-react'
import type { Annotation, SearchResult, ViewerState } from '../../types'
import SelectionPopover from './SelectionPopover'
import AnnotationPanel from './AnnotationPanel'

interface TXTViewerProps {
  file: File
  fileId: string
  viewerState: ViewerState
  annotations: Annotation[]
  searchHighlight: SearchResult | null
  onStateUpdate: (updates: Partial<ViewerState>) => void
  onAddAnnotation: (ann: Omit<Annotation, 'id' | 'createdAt'>) => void
  onRemoveAnnotation: (id: string) => void
  onToggleFullscreen: () => void
  onToggleAnnotationsPanel: () => void
}

interface PopoverState {
  visible: boolean
  x: number
  y: number
  selectedText: string
  selectionStart?: number
  selectionEnd?: number
}

function ToolBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30,
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'var(--color-accent-soft)' : 'transparent',
        border: active ? '1px solid var(--color-accent-primary)' : 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        color: active ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
        transition: 'background 0.12s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--color-bg-card)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

export default function TXTViewer({
  file,
  fileId,
  viewerState,
  annotations,
  searchHighlight,
  onStateUpdate,
  onAddAnnotation,
  onRemoveAnnotation,
  onToggleFullscreen,
  onToggleAnnotationsPanel,
}: TXTViewerProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [popover, setPopover] = useState<PopoverState>({ visible: false, x: 0, y: 0, selectedText: '' })
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<File>(file)

  useEffect(() => {
    fileRef.current = file
    setLoading(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      setContent((e.target?.result as string) ?? '')
      setLoading(false)
    }
    reader.readAsText(file)
  }, [file])

  useEffect(() => {
    if (searchHighlight?.charOffset != null && contentRef.current) {
      const text = contentRef.current.innerText
      const offset = Math.min(searchHighlight.charOffset, text.length)
      const approxScrollPct = offset / Math.max(text.length, 1)
      const scrollTop = approxScrollPct * (contentRef.current.scrollHeight - contentRef.current.clientHeight)
      contentRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' })
    }
  }, [searchHighlight])

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !contentRef.current) {
      setPopover((p) => ({ ...p, visible: false }))
      return
    }
    const text = sel.toString().trim()
    if (!text) return
    let charStart: number | undefined
    let charEnd: number | undefined
    try {
      const range = sel.getRangeAt(0)
      const contentEl = contentRef.current.querySelector('.prose-viewer') ?? contentRef.current
      const preRange = document.createRange()
      preRange.selectNodeContents(contentEl)
      preRange.setEnd(range.startContainer, range.startOffset)
      charStart = preRange.toString().length
      preRange.setEnd(range.endContainer, range.endOffset)
      charEnd = preRange.toString().length
    } catch {
      // fallback: no position
    }
    setPopover({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      selectedText: text,
      selectionStart: charStart,
      selectionEnd: charEnd,
    })
  }, [])

  const annotationsForFile = annotations.filter((a) => a.fileId === fileId)

  const matchingHighlightId: string | null =
    popover.selectionStart != null && popover.selectionEnd != null
      ? annotationsForFile.find(
          (a) =>
            a.type === 'highlight' &&
            a.charStart != null &&
            a.charEnd != null &&
            a.charStart <= popover.selectionEnd! &&
            a.charEnd >= popover.selectionStart!
        )?.id ?? null
      : null

  const handleRemoveHighlight = useCallback(
    (id: string) => {
      onRemoveAnnotation(id)
      setPopover((p) => ({ ...p, visible: false }))
      window.getSelection()?.removeAllRanges()
    },
    [onRemoveAnnotation]
  )

  const handleHighlight = useCallback(() => {
    if (!popover.selectedText) return
    onAddAnnotation({
      fileId,
      type: 'highlight',
      color: 'var(--color-accent-warn)',
      text: popover.selectedText,
      ...(popover.selectionStart != null &&
        popover.selectionEnd != null && {
          charStart: popover.selectionStart,
          charEnd: popover.selectionEnd,
        }),
    })
    setPopover((p) => ({ ...p, visible: false }))
    window.getSelection()?.removeAllRanges()
  }, [popover, fileId, onAddAnnotation])

  const handleAddNote = useCallback(() => {
    setShowNoteInput(true)
    setNoteInput('')
  }, [])

  const handleNoteSubmit = useCallback(() => {
    onAddAnnotation({
      fileId,
      type: 'note',
      color: 'var(--color-accent-info)',
      text: popover.selectedText,
      comment: noteInput,
      ...(popover.selectionStart != null &&
        popover.selectionEnd != null && {
          charStart: popover.selectionStart,
          charEnd: popover.selectionEnd,
        }),
    })
    setPopover((p) => ({ ...p, visible: false }))
    setShowNoteInput(false)
    window.getSelection()?.removeAllRanges()
  }, [popover, fileId, onAddAnnotation, noteInput])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(popover.selectedText)
    setPopover((p) => ({ ...p, visible: false }))
  }, [popover])

  const handleDownload = useCallback(() => {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [file])

  const renderContent = () => {
    const userHighlights = annotationsForFile.filter((a) => a.type === 'highlight')
    const ranges: { start: number; end: number; isSearch: boolean }[] = []

    if (searchHighlight?.chunkText) {
      const idx = content.indexOf(searchHighlight.chunkText)
      if (idx !== -1) {
        ranges.push({ start: idx, end: idx + searchHighlight.chunkText.length, isSearch: true })
      }
    }
    for (const ann of userHighlights) {
      if (!ann.text) continue
      if (ann.charStart != null && ann.charEnd != null) {
        ranges.push({
          start: Math.max(0, Math.min(ann.charStart, content.length)),
          end: Math.min(content.length, Math.max(ann.charEnd, 0)),
          isSearch: false,
        })
      } else {
        let pos = 0
        while (true) {
          const idx = content.indexOf(ann.text, pos)
          if (idx === -1) break
          ranges.push({ start: idx, end: idx + ann.text.length, isSearch: false })
          pos = idx + 1
        }
      }
    }
    if (ranges.length === 0) return <span>{content}</span>

    ranges.sort((a, b) => a.start - b.start)
    const merged: { start: number; end: number; isSearch: boolean }[] = []
    for (const r of ranges) {
      const last = merged[merged.length - 1]
      if (last && r.start <= last.end) {
        last.end = Math.max(last.end, r.end)
        last.isSearch = last.isSearch || r.isSearch
      } else {
        merged.push({ ...r })
      }
    }

    const segments: React.ReactNode[] = []
    let pos = 0
    for (const r of merged) {
      if (r.start > pos) {
        segments.push(<span key={`t-${pos}`}>{content.slice(pos, r.start)}</span>)
      }
      segments.push(
        <mark
          key={`h-${r.start}`}
          className={r.isSearch ? 'highlight-search' : 'highlight-user'}
          style={{
            borderRadius: 3,
            padding: '1px 0',
            background: r.isSearch ? undefined : 'rgba(232, 201, 122, 0.55)',
          }}
        >
          {content.slice(r.start, r.end)}
        </mark>
      )
      pos = r.end
    }
    if (pos < content.length) {
      segments.push(<span key={`t-${pos}`}>{content.slice(pos)}</span>)
    }
    return <>{segments}</>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Toolbar */}
      <div
        style={{
          background: 'var(--color-bg-toolbar)',
          borderBottom: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: 46,
          flexShrink: 0,
        }}
      >
        <ToolBtn onClick={() => onStateUpdate({ txtFontSize: viewerState.txtFontSize - 1 })} title="Decrease font size">
          <ZoomOut size={15} />
        </ToolBtn>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 32, textAlign: 'center' }}>
          {viewerState.txtFontSize}px
        </span>
        <ToolBtn onClick={() => onStateUpdate({ txtFontSize: viewerState.txtFontSize + 1 })} title="Increase font size">
          <ZoomIn size={15} />
        </ToolBtn>

        <div style={{ width: 1, height: 22, background: 'var(--color-border)', margin: '0 4px' }} />

        <ToolBtn
          onClick={() => onStateUpdate({ highlightToolActive: !viewerState.highlightToolActive })}
          title="Highlight tool"
          active={viewerState.highlightToolActive}
        >
          <Highlighter size={15} />
        </ToolBtn>
        <ToolBtn
          onClick={() => onStateUpdate({ commentToolActive: !viewerState.commentToolActive })}
          title="Add note"
          active={viewerState.commentToolActive}
        >
          <MessageSquarePlus size={15} />
        </ToolBtn>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginRight: 8 }}>
          {wordCount.toLocaleString()} words
        </span>

        <div style={{ width: 1, height: 22, background: 'var(--color-border)', margin: '0 4px' }} />

        <ToolBtn onClick={onToggleAnnotationsPanel} title="Annotations" active={viewerState.showAnnotationsPanel}>
          <PanelRightOpen size={15} />
        </ToolBtn>
        <ToolBtn onClick={handleDownload} title="Download">
          <Download size={15} />
        </ToolBtn>
        <ToolBtn onClick={onToggleFullscreen} title={viewerState.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {viewerState.isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </ToolBtn>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--color-bg-base)',
          borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
        }}
        onMouseUp={handleMouseUp}
      >
        {loading ? (
          <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[120, 180, 100, 160, 90].map((w, i) => (
              <div key={i} className="skeleton" style={{ width: `${w * 0.8}%`, maxWidth: '100%', height: 18 }} />
            ))}
          </div>
        ) : (
          <div className="prose-viewer" style={{ fontSize: viewerState.txtFontSize }}>
            {renderContent()}

            {/* User highlight annotations overlay hint */}
            {annotationsForFile.filter((a) => a.type === 'highlight').length > 0 && (
              <div
                style={{
                  marginTop: 24,
                  padding: '12px 16px',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                }}
              >
                {annotationsForFile.filter((a) => a.type === 'highlight').length} highlight(s) saved — open Annotations panel to view
              </div>
            )}
          </div>
        )}
      </div>

      {/* Annotations panel */}
      {viewerState.showAnnotationsPanel && (
        <AnnotationPanel
          annotations={annotationsForFile}
          onClose={onToggleAnnotationsPanel}
          onAnnotationClick={() => {}}
          onRemove={onRemoveAnnotation}
        />
      )}

      {/* Popover */}
      {popover.visible && !showNoteInput && (
        <SelectionPopover
          x={popover.x}
          y={popover.y}
          onHighlight={handleHighlight}
          onRemoveHighlight={handleRemoveHighlight}
          matchingHighlightId={matchingHighlightId}
          onAddNote={handleAddNote}
          onCopy={handleCopy}
          onClose={() => setPopover((p) => ({ ...p, visible: false }))}
        />
      )}

      {/* Note dialog */}
      {showNoteInput && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={() => setShowNoteInput(false)}
        >
          <div
            style={{
              background: 'var(--color-bg-panel)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              width: 320,
              boxShadow: '0 8px 32px var(--color-shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>
              Add Note
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                marginBottom: 12,
                fontStyle: 'italic',
                background: 'var(--color-bg-card)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              "{popover.selectedText.slice(0, 100)}{popover.selectedText.length > 100 ? '…' : ''}"
            </div>
            <textarea
              autoFocus
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Write your note here…"
              rows={3}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'var(--color-bg-base)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                resize: 'none',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent-primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setShowNoteInput(false)}
                style={{
                  padding: '7px 14px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleNoteSubmit}
                style={{
                  padding: '7px 16px',
                  background: 'var(--color-accent-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'white',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
