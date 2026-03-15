import { X, FileText, FileType, BookOpen, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import type { UploadedFile } from '../../types'

interface FileListItemProps {
  file: UploadedFile
  isActive: boolean
  onClick: () => void
  onRemove: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ type }: { type: UploadedFile['type'] }) {
  const style = { flexShrink: 0 }
  if (type === 'pdf') return <FileType size={16} color="#E85C4A" style={style} />
  if (type === 'epub') return <BookOpen size={16} color="#7C9E87" style={style} />
  return <FileText size={16} color="#A8C4D4" style={style} />
}

function StatusBadge({ status, errorMessage, uploadProgress }: { status: UploadedFile['status']; errorMessage?: string; uploadProgress?: number }) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 'var(--radius-sm)',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  }

  if (status === 'uploading') {
    const pct = uploadProgress != null ? Math.round(uploadProgress * 100) : 0
    return (
      <span style={{ ...base, background: 'var(--color-badge-info-bg)', color: 'var(--color-badge-info-text)', opacity: 0.9 }}>
        <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} />
        {pct}%
      </span>
    )
  }
  if (status === 'processing') {
    return (
      <span style={{ ...base, background: 'var(--color-badge-info-bg)', color: 'var(--color-badge-info-text)', opacity: 0.9 }}>
        <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} />
        Processing
      </span>
    )
  }
  if (status === 'indexed') {
    return (
      <span style={{ ...base, background: 'var(--color-badge-success-bg)', color: 'var(--color-badge-success-text)' }}>
        <CheckCircle2 size={9} />
        Indexed
      </span>
    )
  }
  return (
    <span
      style={{ ...base, background: 'var(--color-badge-error-bg)', color: 'var(--color-badge-error-text)' }}
      title={errorMessage}
    >
      <AlertCircle size={9} />
      Error
    </span>
  )
}

export default function FileListItem({ file, isActive, onClick, onRemove }: FileListItemProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        border: isActive ? '1px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
        borderLeft: isActive ? '3px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
        background: isActive ? 'var(--color-accent-soft)' : 'var(--color-bg-card)',
        transition: 'all 0.15s',
        boxShadow: '0 1px 3px var(--color-shadow)',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = 'var(--color-bg-panel)'
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'var(--color-bg-card)'
      }}
    >
      <FileIcon type={file.type} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={file.name}
        >
          {file.name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatSize(file.size)}</span>
          <StatusBadge status={file.status} errorMessage={file.errorMessage} uploadProgress={file.uploadProgress} />
        </div>
        {file.status === 'uploading' && file.uploadProgress != null && (
          <div
            style={{
              marginTop: 4,
              height: 3,
              borderRadius: 2,
              background: 'var(--color-border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.round(file.uploadProgress * 100)}%`,
                background: 'var(--color-accent-primary)',
                borderRadius: 2,
                transition: 'width 0.15s ease',
              }}
            />
          </div>
        )}
        {file.status === 'error' && file.errorMessage && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: '#a33',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={file.errorMessage}
          >
            {file.errorMessage}
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        title="Remove file"
        style={{
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          flexShrink: 0,
          transition: 'background 0.1s, color 0.1s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#fde8e8'
          e.currentTarget.style.color = '#c0392b'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--color-text-muted)'
        }}
      >
        <X size={13} />
      </button>
    </div>
  )
}
