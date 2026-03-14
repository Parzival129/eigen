import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import type { Annotation, SearchResult, ViewerState } from '../../types'
import SelectionPopover from './SelectionPopover'
import AnnotationPanel from './AnnotationPanel'
import PDFToolbar from './PDFToolbar'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

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
  highlightRects?: Array<{ left: number; top: number; width: number; height: number }>
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
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1, 2, 3]))
  const [pageHeights, setPageHeights] = useState<Map<number, number>>(new Map())
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const fileUrl = useRef<string>(URL.createObjectURL(file))

  useEffect(() => {
    const url = URL.createObjectURL(file)
    fileUrl.current = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const obs = new ResizeObserver((entries) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width - 48)
        }
      }, 150)
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => {
      clearTimeout(timer)
      obs.disconnect()
    }
  }, [])

  // IntersectionObserver for page virtualization
  useEffect(() => {
    if (!containerRef.current || numPages === 0) return
    observerRef.current?.disconnect()
    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev)
          for (const entry of entries) {
            const pageNum = Number(entry.target.getAttribute('data-page'))
            if (entry.isIntersecting) {
              next.add(pageNum)
            } else {
              next.delete(pageNum)
            }
          }
          if (next.size === prev.size && [...next].every((p) => prev.has(p))) return prev
          return next
        })
        // Update current page based on most visible entry
        const intersecting = entries.filter((e) => e.isIntersecting)
        if (intersecting.length > 0) {
          const best = intersecting.reduce((a, b) =>
            b.intersectionRatio > a.intersectionRatio ? b : a
          )
          const pageNum = Number(best.target.getAttribute('data-page'))
          if (pageNum) onPageChange(pageNum)
        }
      },
      { root: containerRef.current, rootMargin: '1500px 0px' }
    )
    observerRef.current = observer
    pageRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [numPages, onPageChange])

  // Register a page element with the observer
  const setPageRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current.set(pageNum, el)
      observerRef.current?.observe(el)
    } else {
      const prev = pageRefs.current.get(pageNum)
      if (prev) observerRef.current?.unobserve(prev)
      pageRefs.current.delete(pageNum)
    }
  }, [])

  const handlePageRenderSuccess = useCallback((pageNum: number) => {
    const el = pageRefs.current.get(pageNum)
    if (el) {
      setPageHeights((prev) => {
        if (prev.get(pageNum) === el.offsetHeight) return prev
        const next = new Map(prev)
        next.set(pageNum, el.offsetHeight)
        return next
      })
    }
  }, [])

  useEffect(() => {
    if (searchHighlight?.pageNumber) {
      // Force-add page to visible set so it renders before scrolling
      setVisiblePages((prev) => {
        if (prev.has(searchHighlight.pageNumber!)) return prev
        const next = new Set(prev)
        next.add(searchHighlight.pageNumber!)
        return next
      })
      onPageChange(searchHighlight.pageNumber)
      // Small delay to allow render before scroll
      setTimeout(() => {
        const el = document.getElementById(`pdf-page-${searchHighlight.pageNumber}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
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

  const handleMouseUp = useCallback((e: React.MouseEvent, pageNum: number) => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) {
      setPopover((p) => ({ ...p, visible: false }))
      return
    }
    const text = sel.toString().trim()
    if (!text) return
    let highlightRects: Array<{ left: number; top: number; width: number; height: number }> | undefined
    try {
      const range = sel.getRangeAt(0)
      const pageEl = document.getElementById(`pdf-page-${pageNum}`)
      if (pageEl) {
        const pageRect = pageEl.getBoundingClientRect()
        const rects = range.getClientRects()
        highlightRects = Array.from(rects)
          .filter((r) => r.width > 0 && r.height > 0)
          .map((r) => ({
            left: r.left - pageRect.left,
            top: r.top - pageRect.top,
            width: r.width,
            height: r.height,
          }))
      }
    } catch {
      // ignore
    }
    setPopover({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      selectedText: text,
      pageNumber: pageNum,
      highlightRects,
    })
  }, [])

  const handleHighlight = useCallback(() => {
    if (!popover.selectedText) return
    onAddAnnotation({
      fileId,
      type: 'highlight',
      color: 'var(--color-accent-warn)',
      pageNumber: popover.pageNumber,
      text: popover.selectedText,
      ...(popover.highlightRects &&
        popover.highlightRects.length > 0 && {
          highlightRects: popover.highlightRects,
        }),
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
      ...(popover.highlightRects && popover.highlightRects.length > 0 && {
        highlightRects: popover.highlightRects,
      }),
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

  const annotationsForFile = useMemo(() => annotations.filter((a) => a.fileId === fileId), [annotations, fileId])

  const annotationsByPage = useMemo(() => {
    const map = new Map<number, Annotation[]>()
    for (const a of annotationsForFile) {
      if (a.pageNumber == null) continue
      const arr = map.get(a.pageNumber)
      if (arr) arr.push(a)
      else map.set(a.pageNumber, [a])
    }
    return map
  }, [annotationsForFile])

  const activeAnnotationPage = activeAnnotationId
    ? (annotationsForFile.find((a) => a.id === activeAnnotationId)?.pageNumber ?? null)
    : null

  const rectsOverlap = (
    a: { left: number; top: number; width: number; height: number },
    b: { left: number; top: number; width: number; height: number }
  ) =>
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top

  const matchingHighlightId =
    popover.pageNumber != null
      ? annotationsForFile.find((a) => {
          if (a.type !== 'highlight' || a.pageNumber !== popover.pageNumber) return false
          if (
            popover.highlightRects &&
            popover.highlightRects.length > 0 &&
            a.highlightRects &&
            a.highlightRects.length > 0
          ) {
            return a.highlightRects.some((ar) =>
              popover.highlightRects!.some((pr) => rectsOverlap(ar, pr))
            )
          }
          return a.text === popover.selectedText
        })?.id ?? null
      : null

  const handleRemoveHighlight = useCallback(
    (id: string) => {
      onRemoveAnnotation(id)
      setPopover((p) => ({ ...p, visible: false }))
      window.getSelection()?.removeAllRanges()
    },
    [onRemoveAnnotation]
  )

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
            const isVisible = visiblePages.has(pageNum)
            const isSearchPage = searchHighlight?.pageNumber === pageNum
            const pageAnnotations = annotationsByPage.get(pageNum) ?? []
            const pageHighlights = pageAnnotations.filter((a) => a.type === 'highlight')
            const pageNotes = pageAnnotations.filter((a) => a.type === 'note')
            const placeholderHeight = pageHeights.get(pageNum) ?? Math.round((containerWidth * viewerState.zoom) * 1.414)

            if (!isVisible) {
              return (
                <div
                  key={pageNum}
                  id={`pdf-page-${pageNum}`}
                  data-page={pageNum}
                  ref={(el) => setPageRef(pageNum, el)}
                  style={{
                    height: placeholderHeight,
                    background: 'var(--color-bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 8,
                  }}
                />
              )
            }

            return (
              <div
                key={pageNum}
                id={`pdf-page-${pageNum}`}
                data-page={pageNum}
                ref={(el) => setPageRef(pageNum, el)}
                className={activeAnnotationPage === pageNum ? 'pdf-page-wrapper annotation-flash' : 'pdf-page-wrapper'}
                style={{
                  position: 'relative',
                  outline: activeAnnotationPage === pageNum
                    ? '3px solid var(--color-accent-info)'
                    : isSearchPage ? '2px solid var(--color-accent-primary)' : 'none',
                  outlineOffset: 2,
                  transition: 'outline 0.3s',
                }}
                onMouseUp={(e) => handleMouseUp(e, pageNum)}
              >
                <Page
                  pageNumber={pageNum}
                  width={computePageWidth()}
                  rotate={viewerState.rotation}
                  renderTextLayer
                  renderAnnotationLayer
                  onRenderSuccess={() => handlePageRenderSuccess(pageNum)}
                />

                {/* User highlight overlays */}
                {pageAnnotations
                  .filter((a) => a.highlightRects && a.highlightRects.length > 0)
                  .flatMap((ann) =>
                    (ann.highlightRects ?? []).map((rect, i) => (
                      <div
                        key={`${ann.id}-${i}`}
                        className={
                          activeAnnotationId === ann.id
                            ? (ann.type === 'note' ? 'annotation-flash' : 'annotation-flash-highlight')
                            : ann.type === 'note' ? '' : 'highlight-user'
                        }
                        style={{
                          position: 'absolute',
                          left: rect.left,
                          top: rect.top,
                          width: rect.width,
                          height: rect.height,
                          background: activeAnnotationId === ann.id
                            ? undefined
                            : ann.type === 'note' ? 'rgba(168, 196, 212, 0.45)' : undefined,
                          borderBottom: ann.type === 'note' ? '2px solid var(--color-accent-info)' : undefined,
                          borderRadius: 2,
                          pointerEvents: 'none',
                          zIndex: 4,
                        }}
                      />
                    ))
                  )}

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

                {/* Annotation badges */}
                {pageAnnotations.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: isSearchPage ? 44 : 8,
                      right: 8,
                      display: 'flex',
                      gap: 4,
                      zIndex: 5,
                      pointerEvents: 'none',
                    }}
                  >
                    {pageHighlights.length > 0 && (
                      <div style={{
                        background: 'var(--color-accent-warn)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '3px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#7a5a00',
                      }}>
                        {pageHighlights.length} highlight{pageHighlights.length > 1 ? 's' : ''}
                      </div>
                    )}
                    {pageNotes.length > 0 && (
                      <div style={{
                        background: 'var(--color-accent-info)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '3px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#2a4a5e',
                      }}>
                        {pageNotes.length} note{pageNotes.length > 1 ? 's' : ''}
                      </div>
                    )}
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
          activeAnnotationId={activeAnnotationId}
          onClose={onToggleAnnotationsPanel}
          onAnnotationClick={(ann) => {
            if (!ann.pageNumber) return
            setVisiblePages((prev) => {
              if (prev.has(ann.pageNumber!)) return prev
              const next = new Set(prev)
              next.add(ann.pageNumber!)
              return next
            })
            onPageChange(ann.pageNumber)
            setTimeout(() => {
              const el = document.getElementById(`pdf-page-${ann.pageNumber}`)
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 50)
            setActiveAnnotationId(ann.id)
            setTimeout(() => setActiveAnnotationId(null), 3000)
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
          onRemoveHighlight={handleRemoveHighlight}
          matchingHighlightId={matchingHighlightId}
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
