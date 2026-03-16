import { Link } from 'react-router-dom'
import { Search, FileText, Sparkles, GraduationCap, Moon, Sun, ArrowRight } from 'lucide-react'
import { useDarkMode } from '../hooks/useDarkMode'

const features = [
  {
    icon: Search,
    title: 'Semantic Search',
    description: 'Go beyond keyword matching. Find content by meaning, not just words.',
  },
  {
    icon: FileText,
    title: 'Multi-format Support',
    description: 'Upload PDFs, EPUBs, text files, and MP4 videos with transcription.',
  },
  {
    icon: Sparkles,
    title: 'AI Summaries',
    description: 'Get concise AI-generated summaries of your search results.',
  },
  {
    icon: GraduationCap,
    title: 'Practice Quizzes',
    description: 'Test your understanding with auto-generated quizzes from your documents.',
  },
]

export default function LandingPage() {
  const [isDarkMode, toggleDarkMode] = useDarkMode()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-base)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          maxWidth: 1100,
          width: '100%',
          margin: '0 auto',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#7b8c6e',
              userSelect: 'none',
            }}
          >
            <span
              style={{
                color: '#ffffff',
                fontSize: 20,
                fontFamily: 'sans-serif',
                lineHeight: '1',
                display: 'block',
                margin: 0,
                padding: 0,
              }}
            >
              [λ]
            </span>
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
        </div>

        <button
          onClick={toggleDarkMode}
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
      </header>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: 1100,
          width: '100%',
          margin: '0 auto',
          padding: '80px 24px 64px',
          textAlign: 'center',
          animation: 'fade-in 0.5s ease',
        }}
      >
        <h1
          style={{
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--color-text-primary)',
            margin: '0 0 16px',
            lineHeight: 1.1,
          }}
        >
          Search your documents with AI
        </h1>
        <p
          style={{
            fontSize: 18,
            color: 'var(--color-text-secondary)',
            maxWidth: 560,
            margin: '0 auto 40px',
            lineHeight: 1.6,
          }}
        >
          Upload PDFs, EPUBs, text files, and videos. Eigen uses semantic search to find exactly
          what you need.
        </p>
        <Link
          to="/app"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--color-accent-primary)',
            color: '#ffffff',
            borderRadius: 'var(--radius-md)',
            padding: '12px 28px',
            fontSize: 16,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Get Started
          <ArrowRight size={18} />
        </Link>
      </section>

      {/* Feature Grid */}
      <section
        style={{
          maxWidth: 1100,
          width: '100%',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                style={{
                  background: 'var(--color-bg-panel)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 24,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Icon size={20} color="var(--color-accent-primary)" />
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    margin: '0 0 8px',
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--color-text-secondary)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: 'auto',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: 'var(--color-text-muted)',
          }}
        >
          Built with Eigen
        </span>
      </footer>
    </div>
  )
}
