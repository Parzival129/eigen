import { useState } from 'react'
import { GraduationCap, CheckCircle, XCircle } from 'lucide-react'
import type { QuizData } from '../../types'

interface QuizPanelProps {
  quiz: QuizData | null
  isLoading: boolean
  onGenerate: () => void
  hasResults: boolean
}

export default function QuizPanel({ quiz, isLoading, onGenerate, hasResults }: QuizPanelProps) {
  const [answers, setAnswers] = useState<number[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)

  if (!hasResults) return null

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1].map((i) => (
          <div
            key={i}
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
            <div className="skeleton" style={{ width: '85%', height: 13 }} />
            <div className="skeleton" style={{ width: '70%', height: 13 }} />
            <div className="skeleton" style={{ width: '55%', height: 11 }} />
            <div className="skeleton" style={{ width: '60%', height: 11 }} />
            <div className="skeleton" style={{ width: '50%', height: 11 }} />
            <div className="skeleton" style={{ width: '65%', height: 11 }} />
          </div>
        ))}
      </div>
    )
  }

  if (quiz) {
    const finished = currentQuestion >= quiz.questions.length

    const handlePick = (optionIndex: number) => {
      setAnswers((prev) => [...prev, optionIndex])
      setCurrentQuestion((q) => q + 1)
    }

    const handleRetry = () => {
      setAnswers([])
      setCurrentQuestion(0)
    }

    const score = quiz.questions.filter((q, i) => answers[i] === q.correct_index).length

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          animation: 'fadeSlideIn 0.35s ease',
        }}
      >
        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GraduationCap size={13} color="var(--color-accent-primary)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Practice Quiz
          </span>
          {!finished && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
              Question {currentQuestion + 1} of {quiz.questions.length}
            </span>
          )}
        </div>

        {!finished ? (
          <div
            key={currentQuestion}
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              animation: 'fadeSlideIn 0.25s ease',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
              {currentQuestion + 1}. {quiz.questions[currentQuestion].question}
            </span>
            {quiz.questions[currentQuestion].options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => handlePick(oi)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  background: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'Inter, sans-serif',
                  textAlign: 'left',
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-accent-primary)'
                  e.currentTarget.style.background = 'var(--color-bg-card)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.background = 'var(--color-bg-base)'
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 14,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {score} / {quiz.questions.length}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {score === quiz.questions.length
                  ? 'Perfect score!'
                  : score >= Math.ceil(quiz.questions.length / 2)
                  ? 'Good job!'
                  : 'Keep practicing!'}
              </div>
            </div>

            {quiz.questions.map((q, qi) => {
              const userAnswer = answers[qi]
              const isCorrect = userAnswer === q.correct_index

              return (
                <div
                  key={qi}
                  style={{
                    background: 'var(--color-bg-card)',
                    border: `1px solid ${isCorrect ? 'var(--color-success, #22c55e)' : 'var(--color-error, #ef4444)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    {isCorrect
                      ? <CheckCircle size={14} color="#22c55e" style={{ flexShrink: 0, marginTop: 1 }} />
                      : <XCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />}
                    <span style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                      {qi + 1}. {q.question}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', paddingLeft: 20 }}>
                    Your answer: <span style={{ color: isCorrect ? '#22c55e' : '#ef4444' }}>{q.options[userAnswer]}</span>
                  </div>
                  {!isCorrect && (
                    <div style={{ fontSize: 12, color: '#22c55e', paddingLeft: 20 }}>
                      Correct: {q.options[q.correct_index]}
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: 2,
                      padding: '6px 8px',
                      background: 'var(--color-bg-base)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 11,
                      color: 'var(--color-text-muted)',
                      lineHeight: 1.4,
                    }}
                  >
                    {q.explanation}
                  </div>
                </div>
              )
            })}

            <button
              onClick={handleRetry}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-card)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Retry Quiz
            </button>
          </div>
        )}
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
      <GraduationCap size={14} color="var(--color-accent-primary)" />
      Generate Practice Quiz
    </button>
  )
}
