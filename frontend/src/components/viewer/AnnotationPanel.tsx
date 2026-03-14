import { X, Highlighter, MessageSquare, ChevronRight } from 'lucide-react'
import type { Annotation } from '../../types'

interface AnnotationPanelProps {
  annotations: Annotation[]
  activeAnnotationId?: string | null
  onClose: () => void
  onAnnotationClick: (annotation: Annotation) => void
  onRemove: (id: string) => void
}

export default function AnnotationPanel({
  annotations,
  activeAnnotationId,
  onClose,
  onAnnotationClick,
  onRemove,
}: AnnotationPanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 280,
        background: 'var(--color-bg-panel)',
        borderLeft: '1px solid var(--color-border)',
        borderRadius: '0 var(--radius-lg) var(--radius-lg) 0',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        boxShadow: '-4px 0 16px var(--color-shadow)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
          gap: 8,
        }}
      >
        <Highlighter size={15} color="var(--color-accent-primary)" />
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', flex: 1 }}>
          Annotations
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '1px 7px',
          }}
        >
          {annotations.length}
        </span>
        <button
          onClick={onClose}
          style={{
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-card)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <X size={13} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {annotations.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              fontSize: 12,
              textAlign: 'center',
              gap: 8,
              padding: 24,
            }}
          >
            <Highlighter size={28} style={{ opacity: 0.3 }} />
            No annotations yet.
            <br />
            Select text to highlight or add a note.
          </div>
        ) : (
          annotations.map((ann) => (
            <div
              key={ann.id}
              id={`ann-item-${ann.id}`}
              onClick={() => onAnnotationClick(ann)}
              className={activeAnnotationId === ann.id ? (ann.type === 'highlight' ? 'annotation-flash-highlight' : 'annotation-flash') : ''}
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 10,
                cursor: 'pointer',
                boxShadow: '0 1px 3px var(--color-shadow)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-panel)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-card)')}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 'var(--radius-sm)',
                    background: ann.type === 'highlight' ? 'var(--color-accent-warn)' : 'var(--color-accent-info)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {ann.type === 'highlight' ? (
                    <Highlighter size={11} color="#7a5a00" />
                  ) : (
                    <MessageSquare size={11} color="#2a4a5e" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-primary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.5,
                    }}
                  >
                    "{ann.text}"
                  </div>
                  {ann.comment && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-secondary)',
                        marginTop: 4,
                        fontStyle: 'italic',
                      }}
                    >
                      {ann.comment}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 6,
                    }}
                  >
                    {ann.pageNumber && (
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--color-text-muted)',
                          background: 'var(--color-bg-panel)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '1px 6px',
                        }}
                      >
                        p. {ann.pageNumber}
                      </span>
                    )}
                    <ChevronRight size={10} color="var(--color-text-muted)" style={{ marginLeft: 'auto' }} />
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(ann.id) }}
                  style={{
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fde8e8'; e.currentTarget.style.color = '#c0392b' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
