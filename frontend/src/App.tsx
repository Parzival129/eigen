import { useCallback, useEffect, useRef, useState } from 'react'
import TopNav from './components/TopNav'
import FileManager from './components/sidebar/FileManager'
import PDFViewer from './components/viewer/PDFViewer'
import EPUBViewer from './components/viewer/EPUBViewer'
import TXTViewer from './components/viewer/TXTViewer'
import VideoViewer from './components/viewer/VideoViewer'
import SearchBar from './components/search/SearchBar'
import ResultsList from './components/search/ResultsList'
import { useAnnotations } from './hooks/useAnnotations'
import { useViewerState } from './hooks/useViewerState'
import { uploadFile, searchDocuments, deleteFile, pollJobUntilDone } from './api/client'
import type { UploadedFile, SearchResult } from './types'
import { FileSearch, BookOpen } from 'lucide-react'

const MIN_PANEL_W = 200
const DEFAULT_LEFT_W = 240
const DEFAULT_RIGHT_W = 320

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [scopeFileId, setScopeFileId] = useState<string | null>(null)
  const [activeSearchHighlight, setActiveSearchHighlight] = useState<SearchResult | null>(null)

  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_W)
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_W)
  const dragRef = useRef<{ side: 'left' | 'right'; startX: number; startW: number } | null>(null)

  const viewer = useViewerState()
  const annHook = useAnnotations()

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  // Resizable panels
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const delta = e.clientX - dragRef.current.startX
      if (dragRef.current.side === 'left') {
        setLeftWidth(Math.max(MIN_PANEL_W, dragRef.current.startW + delta))
      } else {
        setRightWidth(Math.max(MIN_PANEL_W, dragRef.current.startW - delta))
      }
    }
    const onMouseUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    for (const f of newFiles) {
      const tempId = crypto.randomUUID()
      const nameLower = f.name.toLowerCase()
      const fileType = nameLower.endsWith('.pdf')
        ? 'pdf' as const
        : nameLower.endsWith('.epub')
        ? 'epub' as const
        : nameLower.endsWith('.mp4')
        ? 'mp4' as const
        : 'txt' as const

      const tempFile: UploadedFile = {
        id: tempId,
        name: f.name,
        type: fileType,
        size: f.size,
        status: 'uploading',
        uploadProgress: 0,
        file: f,
      }
      setFiles((prev) => [...prev, tempFile])

      // Upload each file concurrently (no await in loop)
      uploadFile(f, (progress) => {
        setFiles((prev) =>
          prev.map((pf) => (pf.id === tempId ? { ...pf, uploadProgress: progress } : pf))
        )
      })
        .then((res) => {
          // Replace temp ID with real file_id, mark as processing
          setFiles((prev) =>
            prev.map((pf) =>
              pf.id === tempId
                ? { ...pf, id: res.file_id, status: 'processing', uploadProgress: 1, errorMessage: undefined }
                : pf
            )
          )

          // Poll job status in background
          pollJobUntilDone(res.job_id).then((job) => {
            const newStatus = job.status === 'completed' ? 'indexed' as const : 'error' as const
            setFiles((prev) =>
              prev.map((pf) =>
                pf.id === res.file_id
                  ? { ...pf, status: newStatus, errorMessage: job.error_message ?? undefined }
                  : pf
              )
            )
          })
        })
        .catch((error) => {
          const message = error instanceof Error
            ? error.message.replace(/^API \d+:\s*/, '')
            : 'Upload failed'
          setFiles((prev) =>
            prev.map((pf) =>
              pf.id === tempId
                ? { ...pf, status: 'error', errorMessage: message }
                : pf
            )
          )
        })
    }
  }, [])

  const handleFileRemove = useCallback(
    (fileId: string) => {
      deleteFile(fileId).catch(() => {})
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      annHook.clearAnnotationsForFile(fileId)
      if (viewer.state.activeFileId === fileId) {
        viewer.setActiveFile(null)
        setActiveSearchHighlight(null)
      }
      setSearchResults((prev) => prev.filter((r) => r.fileId !== fileId))
    },
    [viewer, annHook]
  )

  const handleFileSelect = useCallback(
    (fileId: string) => {
      viewer.setActiveFile(fileId)
      setActiveSearchHighlight(null)
    },
    [viewer]
  )

  const handleSearch = useCallback(
    async (query: string) => {
      if (!files.some((f) => f.status === 'indexed')) return
      setIsSearching(true)
      setHasSearched(true)
      try {
        const results = await searchDocuments(query, undefined, scopeFileId ?? undefined)
        setSearchResults(results)
      } finally {
        setIsSearching(false)
      }
    },
    [files, scopeFileId]
  )

  const handleOpenResult = useCallback(
    (result: SearchResult) => {
      const extra: Partial<import('./types').ViewerState> = {}
      if (result.startTime != null) extra.seekTime = result.startTime
      viewer.setActiveFile(result.fileId, extra)
      setActiveSearchHighlight(result)
      if (result.pageNumber) viewer.setPage(result.pageNumber)
    },
    [viewer]
  )

  const handleNewSession = useCallback(() => {
    setFiles([])
    setSearchResults([])
    setHasSearched(false)
    setIsSearching(false)
    setScopeFileId(null)
    setActiveSearchHighlight(null)
    viewer.setActiveFile(null)
  }, [viewer])

  const activeFile = files.find((f) => f.id === viewer.state.activeFileId) ?? null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--color-bg-base)',
        overflow: 'hidden',
      }}
    >
      <TopNav
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((d) => !d)}
        onNewSession={handleNewSession}
      />

      {/* 3-panel layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Left panel */}
        <div style={{ width: leftWidth, minWidth: MIN_PANEL_W, flexShrink: 0, overflow: 'hidden' }}>
          <FileManager
            files={files}
            activeFileId={viewer.state.activeFileId}
            onFilesAdded={handleFilesAdded}
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
          />
        </div>

        {/* Resizable divider left */}
        <div
          className="panel-divider"
          onMouseDown={(e) => {
            dragRef.current = { side: 'left', startX: e.clientX, startW: leftWidth }
            e.preventDefault()
          }}
        />

        {/* Center panel */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: viewer.state.isFullscreen ? 'fixed' : 'relative',
            inset: viewer.state.isFullscreen ? 0 : undefined,
            zIndex: viewer.state.isFullscreen ? 100 : undefined,
            background: viewer.state.isFullscreen ? 'var(--color-bg-base)' : undefined,
          }}
        >
          {activeFile ? (
            activeFile.type === 'pdf' ? (
              <PDFViewer
                key={activeFile.id}
                file={activeFile.file}
                fileId={activeFile.id}
                viewerState={viewer.state}
                annotations={annHook.annotations}
                searchHighlight={activeSearchHighlight?.fileId === activeFile.id ? activeSearchHighlight : null}
                onStateUpdate={viewer.update}
                onAddAnnotation={annHook.addAnnotation}
                onRemoveAnnotation={annHook.removeAnnotation}
                onPageChange={viewer.setPage}
                onZoomChange={viewer.setZoom}
                onFitMode={viewer.setFitMode}
                onRotate={viewer.rotateClockwise}
                onToggleHighlight={viewer.toggleHighlightTool}
                onToggleComment={viewer.toggleCommentTool}
                onFindChange={viewer.setFindQuery}
                onToggleFullscreen={viewer.toggleFullscreen}
                onToggleAnnotationsPanel={viewer.toggleAnnotationsPanel}
              />
            ) : activeFile.type === 'epub' ? (
              <EPUBViewer
                key={activeFile.id}
                file={activeFile.file}
                fileId={activeFile.id}
                viewerState={viewer.state}
                annotations={annHook.annotations}
                searchHighlight={activeSearchHighlight?.fileId === activeFile.id ? activeSearchHighlight : null}
                onStateUpdate={viewer.update}
                onAddAnnotation={annHook.addAnnotation}
                onRemoveAnnotation={annHook.removeAnnotation}
                onToggleFullscreen={viewer.toggleFullscreen}
                onToggleAnnotationsPanel={viewer.toggleAnnotationsPanel}
              />
            ) : activeFile.type === 'mp4' ? (
              <VideoViewer
                key={activeFile.id}
                file={activeFile.file}
                fileId={activeFile.id}
                viewerState={viewer.state}
                onStateUpdate={viewer.update}
                onToggleFullscreen={viewer.toggleFullscreen}
              />
            ) : (
              <TXTViewer
                key={activeFile.id}
                file={activeFile.file}
                fileId={activeFile.id}
                viewerState={viewer.state}
                annotations={annHook.annotations}
                searchHighlight={activeSearchHighlight?.fileId === activeFile.id ? activeSearchHighlight : null}
                onStateUpdate={viewer.update}
                onAddAnnotation={annHook.addAnnotation}
                onRemoveAnnotation={annHook.removeAnnotation}
                onToggleFullscreen={viewer.toggleFullscreen}
                onToggleAnnotationsPanel={viewer.toggleAnnotationsPanel}
              />
            )
          ) : (
            <EmptyViewer hasFiles={files.length > 0} />
          )}
        </div>

        {/* Resizable divider right */}
        <div
          className="panel-divider"
          onMouseDown={(e) => {
            dragRef.current = { side: 'right', startX: e.clientX, startW: rightWidth }
            e.preventDefault()
          }}
        />

        {/* Right panel */}
        <div
          style={{
            width: rightWidth,
            minWidth: MIN_PANEL_W,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--color-bg-panel)',
            borderLeft: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 16px 12px',
              borderBottom: '1px solid var(--color-border)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <FileSearch size={16} color="var(--color-accent-primary)" />
              <span style={{ fontWeight: 600, fontSize: 18, color: 'var(--color-text-primary)' }}>
                Search
              </span>
            </div>
            <SearchBar
              isLoading={isSearching}
              files={files}
              scopeFileId={scopeFileId}
              onScopeChange={setScopeFileId}
              onSearch={handleSearch}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            <ResultsList
              results={searchResults}
              isLoading={isSearching}
              hasSearched={hasSearched}
              onOpenResult={handleOpenResult}
              onClearResults={() => { setSearchResults([]); setHasSearched(false) }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyViewer({ hasFiles }: { hasFiles: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-base)',
        gap: 16,
        padding: 32,
        borderRadius: 'var(--radius-xl)',
        margin: 8,
        border: '2px dashed var(--color-border)',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BookOpen size={28} color="var(--color-text-muted)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            marginBottom: 6,
          }}
        >
          {hasFiles ? 'Select a document' : 'No documents open'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 260 }}>
          {hasFiles
            ? 'Click a file in the left panel to open it here.'
            : 'Upload a PDF, TXT, EPUB, or MP4 file to get started with semantic search.'}
        </div>
      </div>
    </div>
  )
}
