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
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)
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
    if (!sel || sel.isCollapsed) {
      setPopover((p) => ({ ...p, visible: false }))
      return
    }
    const text = sel.toString().trim()
    if (!text) return
    setPopover({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      selectedText: text,
    })
  }, [])

  const handleHighlight = useCallback(() => {
    if (!popover.selectedText) return
    onAddAnnotation({
      fileId,
      type: 'highlight',
      color: 'var(--color-accent-warn)',
      text: popover.selectedText,
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

  const annotationsForFile = annotations.filter((a) => a.fileId === fileId)

  const handleAnnotationClick = useCallback((ann: Annotation) => {
    const el = document.getElementById(`annotation-${ann.id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setActiveAnnotationId(ann.id)
    setTimeout(() => setActiveAnnotationId(null), 1500)
  }, [])

  const renderContent = () => {
    type Segment = { start: number; end: number; color: string; borderBottom?: string; key: string }
    const segments: Segment[] = []

    for (const ann of annotationsForFile) {
      if (!ann.text) continue
      const idx = content.indexOf(ann.text)
      if (idx === -1) continue
      segments.push({
        start: idx,
        end: idx + ann.text.length,
        color: ann.type === 'note' ? 'rgba(168, 196, 212, 0.45)' : 'rgba(232, 201, 122, 0.45)',
        borderBottom: ann.type === 'note' ? '2px solid var(--color-accent-info)' : undefined,
        key: ann.id,
      })
    }

    if (searchHighlight?.chunkText) {
      const idx = content.indexOf(searchHighlight.chunkText)
      if (idx !== -1) {
        segments.push({
          start: idx,
          end: idx + searchHighlight.chunkText.length,
          color: 'rgba(124, 158, 135, 0.35)',
          key: 'search',
        })
      }
    }

    if (segments.length === 0) return <span>{content}</span>

    segments.sort((a, b) => a.start - b.start)
    const merged: Segment[] = []
    let maxEnd = 0
    for (const seg of segments) {
      if (seg.start >= maxEnd) {
        merged.push(seg)
        maxEnd = seg.end
      } else if (seg.end > maxEnd) {
        merged.push({ ...seg, start: maxEnd })
        maxEnd = seg.end
      }
    }

    const nodes: React.ReactNode[] = []
    let cursor = 0
    for (const seg of merged) {
      if (seg.start > cursor) nodes.push(<span key={`plain-${cursor}`}>{content.slice(cursor, seg.start)}</span>)
      nodes.push(
        <mark
          key={seg.key}
          id={`annotation-${seg.key}`}
          className={activeAnnotationId === seg.key ? 'annotation-flash' : ''}
          style={{ background: activeAnnotationId === seg.key ? undefined : seg.color, borderRadius: 2, padding: '1px 0', borderBottom: seg.borderBottom }}
        >
          {content.slice(seg.start, seg.end)}
        </mark>
      )
      cursor = seg.end
    }
    if (cursor < content.length) nodes.push(<span key={`plain-${cursor}`}>{content.slice(cursor)}</span>)
    return <>{nodes}</>
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
          </div>
        )}
      </div>

      {/* Annotations panel */}
      {viewerState.showAnnotationsPanel && (
        <AnnotationPanel
          annotations={annotationsForFile}
          onClose={onToggleAnnotationsPanel}
          onAnnotationClick={handleAnnotationClick}
          activeAnnotationId={activeAnnotationId}
          onRemove={onRemoveAnnotation}
        />
      )}

      {/* Popover */}
      {popover.visible && !showNoteInput && (
        <SelectionPopover
          x={popover.x}
          y={popover.y}
          onHighlight={handleHighlight}
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
