import { useCallback, useEffect, useRef, useState } from 'react'
import ePub, { type Book, type Rendition } from 'epubjs'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Minimize2,
  PanelRightOpen,
} from 'lucide-react'
import type { Annotation, SearchResult, ViewerState } from '../../types'
import AnnotationPanel from './AnnotationPanel'

interface EPUBViewerProps {
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

export default function EPUBViewer({
  file,
  fileId,
  viewerState,
  annotations,
  onStateUpdate,
  onRemoveAnnotation,
  onToggleFullscreen,
  onToggleAnnotationsPanel,
}: EPUBViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const [fontSize, setFontSize] = useState(viewerState.txtFontSize)
  const [loading, setLoading] = useState(true)
  const [chapterLabel, setChapterLabel] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const blobUrl = URL.createObjectURL(file)
    const book = ePub(blobUrl)
    bookRef.current = book

    const rendition = book.renderTo(container, {
      width: '100%',
      height: '100%',
      spread: 'none',
    })

    renditionRef.current = rendition
    rendition.themes.fontSize(`${fontSize}px`)

    rendition.display().then(() => {
      setLoading(false)
    })

    rendition.on('relocated', (location: { start: { href: string } }) => {
      const spine = book.spine as unknown as { items: Array<{ href: string; index: number }> }
      if (spine?.items) {
        const item = spine.items.find((s) => s.href === location.start.href)
        if (item) {
          const page = item.index + 1
          const total = spine.items.length
          onStateUpdate({ page, totalPages: total })
          setChapterLabel(`${page} / ${total}`)
        }
      }
    })

    return () => {
      rendition.destroy()
      book.destroy()
      URL.revokeObjectURL(blobUrl)
      bookRef.current = null
      renditionRef.current = null
    }
  }, [file])

  const handlePrev = useCallback(() => {
    renditionRef.current?.prev()
  }, [])

  const handleNext = useCallback(() => {
    renditionRef.current?.next()
  }, [])

  const handleFontSizeChange = useCallback((delta: number) => {
    setFontSize((prev) => {
      const next = Math.max(10, Math.min(32, prev + delta))
      renditionRef.current?.themes.fontSize(`${next}px`)
      onStateUpdate({ txtFontSize: next })
      return next
    })
  }, [onStateUpdate])

  const handleDownload = useCallback(() => {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [file])

  const annotationsForFile = annotations.filter((a) => a.fileId === fileId)

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
        <ToolBtn onClick={handlePrev} title="Previous chapter">
          <ChevronLeft size={15} />
        </ToolBtn>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 48, textAlign: 'center' }}>
          {chapterLabel || '—'}
        </span>
        <ToolBtn onClick={handleNext} title="Next chapter">
          <ChevronRight size={15} />
        </ToolBtn>

        <div style={{ width: 1, height: 22, background: 'var(--color-border)', margin: '0 4px' }} />

        <ToolBtn onClick={() => handleFontSizeChange(-1)} title="Decrease font size">
          <ZoomOut size={15} />
        </ToolBtn>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 32, textAlign: 'center' }}>
          {fontSize}px
        </span>
        <ToolBtn onClick={() => handleFontSizeChange(1)} title="Increase font size">
          <ZoomIn size={15} />
        </ToolBtn>

        <div style={{ flex: 1 }} />

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

      {/* EPUB render area */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          background: 'var(--color-bg-base)',
          borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
          position: 'relative',
        }}
      >
        {loading && (
          <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[120, 180, 100, 160, 90].map((w, i) => (
              <div key={i} className="skeleton" style={{ width: `${w * 0.8}%`, maxWidth: '100%', height: 18 }} />
            ))}
          </div>
        )}
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            visibility: loading ? 'hidden' : 'visible',
          }}
        />
      </div>

      {/* Annotations panel */}
      {viewerState.showAnnotationsPanel && (
        <AnnotationPanel
          annotations={annotationsForFile}
          onClose={onToggleAnnotationsPanel}
          onAnnotationClick={(ann) => {
            setActiveAnnotationId(ann.id)
            setTimeout(() => setActiveAnnotationId(null), 3000)
          }}
          activeAnnotationId={activeAnnotationId}
          onRemove={onRemoveAnnotation}
        />
      )}
    </div>
  )
}
