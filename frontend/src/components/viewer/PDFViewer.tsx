import { useCallback, useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import type { Annotation, SearchResult, ViewerState } from '../../types'
import SelectionPopover from './SelectionPopover'
import AnnotationPanel from './AnnotationPanel'
import PDFToolbar from './PDFToolbar'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface PDFViewerProps {
  file: File
  fileId: string
  viewerState: ViewerState
  annotations: Annotation[]
  searchHighlight: SearchResult | null
  onStateUpdate: (updates: Partial<ViewerState>) => void
  onAddAnnotation: (ann: Omit<Annotation, 'id' | 'createdAt'>) => void
  onRemoveAnnotation: (id: string) => void
  onPageChange: (page: number) => void
  onZoomChange: (zoom: number) => void
  onFitMode: (mode: ViewerState['fitMode']) => void
  onRotate: () => void
  onToggleHighlight: () => void
  onToggleComment: () => void
  onFindChange: (q: string) => void
  onToggleFullscreen: () => void
  onToggleAnnotationsPanel: () => void
}

interface PopoverState {
  visible: boolean
  x: number
  y: number
  selectedText: string
  pageNumber?: number
}

export default function PDFViewer({
  file,
  fileId,
  viewerState,
  annotations,
  searchHighlight,
  onStateUpdate,
  onAddAnnotation,
  onRemoveAnnotation,
  onPageChange,
  onZoomChange,
  onFitMode,
  onRotate,
  onToggleHighlight,
  onToggleComment,
  onFindChange,
  onToggleFullscreen,
  onToggleAnnotationsPanel,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState(0)
  const [containerWidth, setContainerWidth] = useState(600)
  const [popover, setPopover] = useState<PopoverState>({ visible: false, x: 0, y: 0, selectedText: '' })
  const [noteInput, setNoteInput] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const fileUrl = useRef<string>(URL.createObjectURL(file))

  useEffect(() => {
    const url = URL.createObjectURL(file)
    fileUrl.current = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width - 48)
      }
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (searchHighlight?.pageNumber) {
      onPageChange(searchHighlight.pageNumber)
      const el = document.getElementById(`pdf-page-${searchHighlight.pageNumber}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [searchHighlight])

  const computePageWidth = useCallback(() => {
    if (viewerState.fitMode === 'width') return containerWidth
    if (viewerState.fitMode === 'page') return undefined
    return containerWidth * viewerState.zoom
  }, [containerWidth, viewerState.fitMode, viewerState.zoom])

  const handleDocumentLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    onStateUpdate({ totalPages: numPages })
  }, [onStateUpdate])

  const handleMouseUp = useCallback(
    (e: React.MouseEvent, pageNum: number) => {
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
        pageNumber: pageNum,
      })
    },
    []
  )

  const handleHighlight = useCallback(() => {
    if (!popover.selectedText) return
    onAddAnnotation({
      fileId,
      type: 'highlight',
      color: 'var(--color-accent-warn)',
      pageNumber: popover.pageNumber,
      text: popover.selectedText,
    })
    window.getSelection()?.removeAllRanges()
    setPopover((p) => ({ ...p, visible: false }))
  }, [popover, fileId, onAddAnnotation])

  const handleAddNote = useCallback(() => {
    setShowNoteInput(true)
    setNoteInput('')
  }, [])

  const handleNoteSubmit = useCallback(() => {
    if (!popover.selectedText) return
    onAddAnnotation({
      fileId,
      type: 'note',
      color: 'var(--color-accent-info)',
      pageNumber: popover.pageNumber,
      text: popover.selectedText,
      comment: noteInput,
    })
    window.getSelection()?.removeAllRanges()
    setPopover((p) => ({ ...p, visible: false }))
    setShowNoteInput(false)
  }, [popover, fileId, onAddAnnotation, noteInput])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(popover.selectedText)
    setPopover((p) => ({ ...p, visible: false }))
  }, [popover])

  const handleDownload = useCallback(() => {
    const a = document.createElement('a')
    a.href = fileUrl.current
    a.download = file.name
    a.click()
  }, [file])

  const annotationsForFile = annotations.filter((a) => a.fileId === fileId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <PDFToolbar
        state={viewerState}
        onPageChange={onPageChange}
        onZoomChange={onZoomChange}
        onFitMode={onFitMode}
        onRotate={onRotate}
        onToggleHighlight={onToggleHighlight}
        onToggleComment={onToggleComment}
        onFindChange={onFindChange}
        onDownload={handleDownload}
        onToggleFullscreen={onToggleFullscreen}
        onToggleAnnotationsPanel={onToggleAnnotationsPanel}
      />

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '24px',
          background: 'var(--color-bg-base)',
          borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
          position: 'relative',
        }}
      >
        <Document
          file={fileUrl.current}
          onLoadSuccess={handleDocumentLoad}
          loading={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ width: '100%', height: 700 }} />
              ))}
            </div>
          }
          error={
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Failed to load PDF. Please try another file.
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
            const isSearchPage = searchHighlight?.pageNumber === pageNum
            return (
              <div
                key={pageNum}
                id={`pdf-page-${pageNum}`}
                className="pdf-page-wrapper"
                style={{
                  outline: isSearchPage ? '2px solid var(--color-accent-primary)' : 'none',
                  outlineOffset: 2,
                }}
                onMouseUp={(e) => handleMouseUp(e, pageNum)}
              >
                <Page
                  pageNumber={pageNum}
                  width={computePageWidth()}
                  rotate={viewerState.rotation}
                  renderTextLayer
                  renderAnnotationLayer
                />

                {/* Search highlight overlay (shows on matched page) */}
                {isSearchPage && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      right: 8,
                      background: 'rgba(124, 158, 135, 0.15)',
                      border: '1px solid var(--color-accent-primary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 10px',
                      fontSize: 12,
                      color: 'var(--color-accent-primary)',
                      fontWeight: 500,
                      zIndex: 5,
                      pointerEvents: 'none',
                    }}
                  >
                    Search result matched on this page
                  </div>
                )}
              </div>
            )
          })}
        </Document>
      </div>

      {/* Annotations panel overlay */}
      {viewerState.showAnnotationsPanel && (
        <AnnotationPanel
          annotations={annotationsForFile}
          onClose={onToggleAnnotationsPanel}
          onAnnotationClick={(ann) => {
            if (ann.pageNumber) onPageChange(ann.pageNumber)
          }}
          onRemove={onRemoveAnnotation}
        />
      )}

      {/* Selection popover */}
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

      {/* Note input dialog */}
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
