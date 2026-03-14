import { Trash2, SearchX } from 'lucide-react'
import ResultCard from './ResultCard'
import SummaryPanel from './SummaryPanel'
import QuizPanel from './QuizPanel'
import type { SearchResult, QuizData } from '../../types'

interface ResultsListProps {
  results: SearchResult[]
  isLoading: boolean
  hasSearched: boolean
  onOpenResult: (result: SearchResult) => void
  onClearResults: () => void
  summary: string | null
  isSummaryLoading: boolean
  onGenerateSummary: () => void
  quiz: QuizData | null
  isQuizLoading: boolean
  onGenerateQuiz: () => void
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', gap: 6 }}>
        <div className="skeleton" style={{ width: 28, height: 18 }} />
        <div className="skeleton" style={{ flex: 1, height: 18 }} />
        <div className="skeleton" style={{ width: 36, height: 18 }} />
      </div>
      <div className="skeleton" style={{ width: '100%', height: 6 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div className="skeleton" style={{ width: '100%', height: 13 }} />
        <div className="skeleton" style={{ width: '90%', height: 13 }} />
        <div className="skeleton" style={{ width: '70%', height: 13 }} />
      </div>
      <div className="skeleton" style={{ width: '100%', height: 32 }} />
    </div>
  )
}

export default function ResultsList({
  results,
  isLoading,
  hasSearched,
  onOpenResult,
  onClearResults,
  summary,
  isSummaryLoading,
  onGenerateSummary,
  quiz,
  isQuizLoading,
  onGenerateQuiz,
}: ResultsListProps) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (!hasSearched) {
    return (
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
          gap: 10,
          padding: '40px 16px',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SearchX size={22} color="var(--color-text-muted)" />
        </div>
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4, color: 'var(--color-text-secondary)' }}>
            No searches yet
          </div>
          Upload a document and enter a query to find semantically relevant passages.
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
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
          padding: '40px 16px',
        }}
      >
        <SearchX size={28} style={{ opacity: 0.4 }} />
        No results found.
        <br />
        Try a different query or upload more documents.
      </div>
    )
  }

  const hasResults = results.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SummaryPanel
        summary={summary}
        isLoading={isSummaryLoading}
        onGenerate={onGenerateSummary}
        hasResults={hasResults}
      />
      <QuizPanel
        quiz={quiz}
        isLoading={isQuizLoading}
        onGenerate={onGenerateQuiz}
        hasResults={hasResults}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {results.length} result{results.length !== 1 ? 's' : ''} found
        </span>
        <button
          onClick={onClearResults}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-card)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Trash2 size={11} />
          Clear
        </button>
      </div>
      {results.map((r, i) => (
        <ResultCard key={r.id} result={r} rank={i + 1} onOpen={onOpenResult} />
      ))}
    </div>
  )
}
