import { Sparkles } from 'lucide-react'
import katex from 'katex'

function renderMarkup(text: string): React.ReactNode[] {
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$|\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const html = katex.renderToString(part.slice(2, -2), { displayMode: true, throwOnError: false })
      return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      const html = katex.renderToString(part.slice(1, -1), { displayMode: false, throwOnError: false })
      return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

interface SummaryPanelProps {
  summary: string | null
  isLoading: boolean
  onGenerate: () => void
  hasResults: boolean
}

export default function SummaryPanel({ summary, isLoading, onGenerate, hasResults }: SummaryPanelProps) {
  if (!hasResults) return null

  if (isLoading) {
    return (
      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div className="skeleton" style={{ width: '60%', height: 14 }} />
        <div className="skeleton" style={{ width: '100%', height: 13 }} />
        <div className="skeleton" style={{ width: '95%', height: 13 }} />
        <div className="skeleton" style={{ width: '80%', height: 13 }} />
      </div>
    )
  }

  if (summary) {
    return (
      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 12,
          opacity: 1,
          transform: 'translateY(0)',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
          animation: 'fadeSlideIn 0.35s ease',
        }}
      >
        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={13} color="var(--color-accent-primary)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Summary
            </span>
          </div>
          <button
            onClick={onGenerate}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-base)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Regenerate
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.5 }}>
          {renderMarkup(summary)}
        </p>
      </div>
    )
  }

  return (
    <button
      onClick={onGenerate}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '8px 12px',
        background: 'transparent',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        fontSize: 13,
        color: 'var(--color-text-secondary)',
        fontFamily: 'Inter, sans-serif',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-bg-card)'
        e.currentTarget.style.borderColor = 'var(--color-accent-primary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'var(--color-border)'
      }}
    >
      <Sparkles size={14} color="var(--color-accent-primary)" />
      Get Summary
    </button>
  )
}
