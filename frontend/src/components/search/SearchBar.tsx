import { useState } from 'react'
import { Search, Loader2, ChevronDown } from 'lucide-react'
import type { UploadedFile } from '../../types'

interface SearchBarProps {
  isLoading: boolean
  files: UploadedFile[]
  scopeFileId: string | null
  onScopeChange: (fileId: string | null) => void
  onSearch: (query: string) => void
}

export default function SearchBar({
  isLoading,
  files,
  scopeFileId,
  onScopeChange,
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) onSearch(query.trim())
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Search input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-bg-panel)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0 10px',
          gap: 8,
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocusCapture={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--color-accent-primary)'
          el.style.boxShadow = '0 0 0 3px var(--color-accent-soft)'
        }}
        onBlurCapture={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--color-border)'
          el.style.boxShadow = 'none'
        }}
      >
        <Search size={15} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across your documents…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '10px 0',
            fontSize: 13,
            color: 'var(--color-text-primary)',
            fontFamily: 'Inter, sans-serif',
          }}
        />
      </div>

      {/* Scope selector + submit */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <select
            value={scopeFileId ?? ''}
            onChange={(e) => onScopeChange(e.target.value || null)}
            style={{
              width: '100%',
              height: 34,
              padding: '0 28px 0 10px',
              background: 'var(--color-bg-panel)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All files</option>
            {files.filter((f) => f.status === 'indexed').map((f) => (
              <option key={f.id} value={f.id}>
                {f.name.length > 24 ? f.name.slice(0, 21) + '…' : f.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            color="var(--color-text-muted)"
            style={{ position: 'absolute', right: 8, pointerEvents: 'none' }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--color-accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0 16px',
            height: 34,
            fontSize: 13,
            fontWeight: 600,
            cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
            opacity: isLoading || !query.trim() ? 0.6 : 1,
            transition: 'filter 0.15s',
            fontFamily: 'Inter, sans-serif',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!isLoading && query.trim()) e.currentTarget.style.filter = 'brightness(1.08)'
          }}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
        >
          {isLoading ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Search size={14} />
          )}
          Search
        </button>
      </div>
    </form>
  )
}
