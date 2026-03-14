import { Moon, Sun, RotateCcw, Sigma } from 'lucide-react'

interface TopNavProps {
  isDarkMode: boolean
  onToggleDarkMode: () => void
  onNewSession: () => void
}

export default function TopNav({ isDarkMode, onToggleDarkMode, onNewSession }: TopNavProps) {
  return (
    <header
      style={{
        background: 'var(--color-bg-panel)',
        borderBottom: '1px solid var(--color-border)',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        flexShrink: 0,
        zIndex: 50,
        boxShadow: '0 2px 8px var(--color-shadow)',
      }}
    >
      {/* Logo + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: 'var(--color-accent-primary)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sigma size={18} color="white" strokeWidth={2.2} />
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '-0.02em',
            color: 'var(--color-text-primary)',
          }}
        >
          Eigen
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 7px',
            marginLeft: 4,
            fontWeight: 500,
          }}
        >
          Semantic Search
        </span>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onNewSession}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 14px',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-card)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <RotateCcw size={14} />
          New Session
        </button>

        <button
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-card)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  )
}
