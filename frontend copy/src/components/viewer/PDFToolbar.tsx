import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Highlighter,
  MessageSquarePlus,
  Search,
  Download,
  Maximize2,
  Minimize2,
  PanelRightOpen,
  AlignJustify,
  Layers,
  X,
} from 'lucide-react'
import type { ViewerState } from '../../types'

interface PDFToolbarProps {
  state: ViewerState
  onPageChange: (page: number) => void
  onZoomChange: (zoom: number) => void
  onFitMode: (mode: ViewerState['fitMode']) => void
  onRotate: () => void
  onToggleHighlight: () => void
  onToggleComment: () => void
  onFindChange: (q: string) => void
  onDownload: () => void
  onToggleFullscreen: () => void
  onToggleAnnotationsPanel: () => void
}

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

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
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--color-bg-card)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 22,
        background: 'var(--color-border)',
        flexShrink: 0,
        margin: '0 4px',
      }}
    />
  )
}

export default function PDFToolbar({
  state,
  onPageChange,
  onZoomChange,
  onFitMode,
  onRotate,
  onToggleHighlight,
  onToggleComment,
  onFindChange,
  onDownload,
  onToggleFullscreen,
  onToggleAnnotationsPanel,
}: PDFToolbarProps) {
  return (
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
        overflowX: 'auto',
      }}
    >
      {/* Page navigation */}
      <ToolBtn onClick={() => onPageChange(state.page - 1)} title="Previous page">
        <ChevronLeft size={15} />
      </ToolBtn>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <input
          type="number"
          min={1}
          max={state.totalPages}
          value={state.page}
          onChange={(e) => onPageChange(parseInt(e.target.value) || 1)}
          style={{
            width: 40,
            height: 26,
            textAlign: 'center',
            background: 'var(--color-bg-panel)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-primary)',
            fontSize: 12,
            fontFamily: 'Inter, sans-serif',
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
          / {state.totalPages}
        </span>
      </div>

      <ToolBtn onClick={() => onPageChange(state.page + 1)} title="Next page">
        <ChevronRight size={15} />
      </ToolBtn>

      <Divider />

      {/* Zoom controls */}
      <ToolBtn onClick={() => onZoomChange(state.zoom - 0.25)} title="Zoom out">
        <ZoomOut size={15} />
      </ToolBtn>

      <select
        value={ZOOM_LEVELS.find((z) => Math.abs(z - state.zoom) < 0.01) ?? state.zoom}
        onChange={(e) => onZoomChange(parseFloat(e.target.value))}
        style={{
          height: 26,
          padding: '0 4px',
          background: 'var(--color-bg-panel)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-text-primary)',
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
          outline: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {ZOOM_LEVELS.map((z) => (
          <option key={z} value={z}>
            {Math.round(z * 100)}%
          </option>
        ))}
      </select>

      <ToolBtn onClick={() => onZoomChange(state.zoom + 0.25)} title="Zoom in">
        <ZoomIn size={15} />
      </ToolBtn>

      <Divider />

      {/* Fit modes */}
      <ToolBtn
        onClick={() => onFitMode('width')}
        title="Fit width"
        active={state.fitMode === 'width'}
      >
        <AlignJustify size={15} />
      </ToolBtn>
      <ToolBtn
        onClick={() => onFitMode('page')}
        title="Fit page"
        active={state.fitMode === 'page'}
      >
        <Layers size={15} />
      </ToolBtn>

      {/* Rotate */}
      <ToolBtn onClick={onRotate} title="Rotate clockwise">
        <RotateCw size={15} />
      </ToolBtn>

      <Divider />

      {/* Annotation tools */}
      <ToolBtn onClick={onToggleHighlight} title="Highlight tool" active={state.highlightToolActive}>
        <Highlighter size={15} />
      </ToolBtn>
      <ToolBtn onClick={onToggleComment} title="Add note" active={state.commentToolActive}>
        <MessageSquarePlus size={15} />
      </ToolBtn>

      <Divider />

      {/* Find in document */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-bg-panel)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0 8px',
          gap: 4,
          height: 26,
          flex: '0 1 160px',
          minWidth: 0,
        }}
      >
        <Search size={12} color="var(--color-text-muted)" />
        <input
          type="text"
          placeholder="Find in document…"
          value={state.findQuery}
          onChange={(e) => onFindChange(e.target.value)}
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 12,
            color: 'var(--color-text-primary)',
            fontFamily: 'Inter, sans-serif',
            width: '100%',
            minWidth: 0,
          }}
        />
        {state.findQuery && (
          <button
            onClick={() => onFindChange('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              padding: 0,
            }}
          >
            <X size={11} />
          </button>
        )}
      </div>

      <Divider />

      {/* Annotations panel */}
      <ToolBtn
        onClick={onToggleAnnotationsPanel}
        title="Annotations panel"
        active={state.showAnnotationsPanel}
      >
        <PanelRightOpen size={15} />
      </ToolBtn>

      {/* Download */}
      <ToolBtn onClick={onDownload} title="Download file">
        <Download size={15} />
      </ToolBtn>

      {/* Fullscreen */}
      <ToolBtn onClick={onToggleFullscreen} title={state.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
        {state.isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </ToolBtn>
    </div>
  )
}
