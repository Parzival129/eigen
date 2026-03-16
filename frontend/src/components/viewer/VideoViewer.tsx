import { useCallback, useEffect, useRef } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { ViewerState } from '../../types'

interface VideoViewerProps {
  file: File
  fileId: string
  viewerState: ViewerState
  onToggleFullscreen: () => void
  onStateUpdate: (updates: Partial<ViewerState>) => void
}

function ToolBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30,
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        color: 'var(--color-text-secondary)',
        transition: 'background 0.12s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-card)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  )
}

export default function VideoViewer({
  file,
  viewerState,
  onToggleFullscreen,
  onStateUpdate,
}: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pendingSeek = useRef<number | null>(null)
  const fileUrl = useRef<string>('')

  useEffect(() => {
    const url = URL.createObjectURL(file)
    fileUrl.current = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Seek when seekTime changes — defer until video metadata is loaded
  useEffect(() => {
    if (viewerState.seekTime == null) return
    const video = videoRef.current
    if (!video) return

    const doSeek = (time: number) => {
      video.currentTime = time
      video.play().catch(() => {})
      onStateUpdate({ seekTime: undefined })
    }

    if (video.readyState >= 1) {
      doSeek(viewerState.seekTime)
    } else {
      pendingSeek.current = viewerState.seekTime
      onStateUpdate({ seekTime: undefined })
    }
  }, [viewerState.seekTime, onStateUpdate])

  const handleLoadedMetadata = useCallback(() => {
    if (pendingSeek.current != null && videoRef.current) {
      videoRef.current.currentTime = pendingSeek.current
      videoRef.current.play().catch(() => {})
      pendingSeek.current = null
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div
        style={{
          background: 'var(--color-bg-toolbar)',
          borderBottom: '1px solid var(--color-border)',
          borderRadius: 0,
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: 42,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            paddingLeft: 4,
          }}
          title={file.name}
        >
          {file.name}
        </span>

        <ToolBtn onClick={onToggleFullscreen} title={viewerState.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {viewerState.isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </ToolBtn>
      </div>

      {/* Video */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          overflow: 'hidden',
        }}
      >
        <video
          ref={videoRef}
          controls
          src={fileUrl.current}
          onLoadedMetadata={handleLoadedMetadata}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    </div>
  )
}
