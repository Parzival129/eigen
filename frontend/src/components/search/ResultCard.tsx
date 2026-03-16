import { useState } from 'react'
import { FileText, FileType, BookOpen, Video, ExternalLink, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import type { SearchResult } from '../../types'

interface ResultCardProps {
  result: SearchResult
  rank: number
  onOpen: (result: SearchResult) => void
}

function FileIcon({ type }: { type: SearchResult['fileType'] }) {
  if (type === 'pdf') return <FileType size={13} color="#E85C4A" />
  if (type === 'epub') return <BookOpen size={13} color="var(--color-accent-primary)" />
  if (type === 'mp4') return <Video size={13} color="#B07CC6" />
  return <FileText size={13} color="#A8C4D4" />
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function boldMatchedTerms(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const words = query.trim().split(/\s+/).filter((w) => w.length > 2)
  if (!words.length) return text
  const regex = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        style={{
          background: 'rgba(232, 201, 122, 0.5)',
          borderRadius: 2,
          padding: '0 1px',
          color: 'inherit',
        }}
      >
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export default function ResultCard({ result, rank, onOpen }: ResultCardProps) {
  const pct = Math.round(result.relevanceScore * 100)
  const [expanded, setExpanded] = useState(false)
  const isLong = result.chunkText.length > 150

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 12,
        animation: 'fade-in 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            background: 'var(--color-bg-panel)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '1px 6px',
            flexShrink: 0,
          }}
        >
          #{rank}
        </span>
        <FileIcon type={result.fileType} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={result.fileName}
        >
          {result.fileName}
        </span>
        {result.fileType === 'mp4' && result.startTime != null ? (
          <span
            style={{
              fontSize: 10,
              color: 'var(--color-text-muted)',
              background: 'var(--color-bg-panel)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1px 6px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Clock size={9} />
            {formatTimestamp(result.startTime)}
          </span>
        ) : result.pageNumber ? (
          <span
            style={{
              fontSize: 10,
              color: 'var(--color-text-muted)',
              background: 'var(--color-bg-panel)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1px 6px',
              flexShrink: 0,
            }}
          >
            p. {result.pageNumber}
          </span>
        ) : null}
      </div>

      {/* Score bar */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Relevance
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: pct >= 70 ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
            }}
          >
            {pct}%
          </span>
        </div>
        <div
          style={{
            height: 5,
            background: 'var(--color-bg-panel)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background:
                pct >= 70
                  ? 'var(--color-accent-primary)'
                  : pct >= 45
                  ? 'var(--color-accent-warn)'
                  : 'var(--color-text-muted)',
              borderRadius: 'var(--radius-sm)',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {/* Snippet */}
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
          ...(expanded
            ? {}
            : {
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }),
        }}
      >
        {boldMatchedTerms(result.chunkText, '')}
      </div>

      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-accent-primary)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}

      {/* Open button */}
      <button
        onClick={() => onOpen(result)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          background: 'var(--color-accent-primary)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '6px 12px',
          color: 'white',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          transition: 'filter 0.15s',
          width: '100%',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
      >
        <ExternalLink size={12} />
        Open in viewer
      </button>
    </div>
  )
}
