import { useCallback, useRef, useState } from 'react'
import { Upload, FolderOpen } from 'lucide-react'
import FileListItem from './FileListItem'
import type { UploadedFile } from '../../types'

interface FileManagerProps {
  files: UploadedFile[]
  activeFileId: string | null
  onFilesAdded: (files: File[]) => void
  onFileSelect: (fileId: string) => void
  onFileRemove: (fileId: string) => void
}

export default function FileManager({
  files,
  activeFileId,
  onFilesAdded,
  onFileSelect,
  onFileRemove,
}: FileManagerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const dropped = Array.from(e.dataTransfer.files).filter((f) =>
        ['.pdf', '.txt', '.epub'].some((ext) => f.name.toLowerCase().endsWith(ext))
      )
      if (dropped.length) onFilesAdded(dropped)
    },
    [onFilesAdded]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? [])
      if (selected.length) onFilesAdded(selected)
      e.target.value = ''
    },
    [onFilesAdded]
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 16,
        gap: 12,
        background: 'var(--color-bg-panel)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <FolderOpen size={16} color="var(--color-accent-primary)" />
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>
          Documents
        </span>
        {files.length > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1px 7px',
            }}
          >
            {files.length}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={() => setIsDragging(true)}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? 'var(--color-accent-primary)' : 'var(--color-accent-soft)'}`,
          borderRadius: 'var(--radius-xl)',
          background: isDragging ? 'var(--color-bg-panel)' : 'var(--color-bg-card)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-accent-primary)'
          e.currentTarget.style.background = 'var(--color-bg-panel)'
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.borderColor = 'var(--color-accent-soft)'
            e.currentTarget.style.background = 'var(--color-bg-card)'
          }
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Upload size={18} color="var(--color-accent-primary)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Drop files here
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
            PDF, TXT, EPUB supported
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
          style={{
            background: 'var(--color-accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '6px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            marginTop: 4,
            transition: 'filter 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
        >
          Browse files
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.epub"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      {/* File list */}
      {files.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {files.map((file) => (
            <FileListItem
              key={file.id}
              file={file}
              isActive={file.id === activeFileId}
              onClick={() => onFileSelect(file.id)}
              onRemove={() => onFileRemove(file.id)}
            />
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 12,
            textAlign: 'center',
            padding: 16,
          }}
        >
          No documents yet.
          <br />
          Upload a file to get started.
        </div>
      )}
    </div>
  )
}
