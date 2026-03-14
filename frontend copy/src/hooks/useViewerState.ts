import { useState, useCallback } from 'react'
import type { ViewerState } from '../types'

const DEFAULT_STATE: ViewerState = {
  activeFileId: null,
  page: 1,
  totalPages: 1,
  zoom: 1.0,
  rotation: 0,
  fitMode: 'width',
  highlightToolActive: false,
  commentToolActive: false,
  findQuery: '',
  isFullscreen: false,
  showAnnotationsPanel: false,
  txtFontSize: 16,
}

export function useViewerState() {
  const [state, setState] = useState<ViewerState>(DEFAULT_STATE)

  const setActiveFile = useCallback((fileId: string | null) => {
    setState((_prev) => ({
      ...DEFAULT_STATE,
      activeFileId: fileId,
    }))
  }, [])

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page: Math.max(1, Math.min(page, prev.totalPages)) }))
  }, [])

  const setTotalPages = useCallback((total: number) => {
    setState((prev) => ({ ...prev, totalPages: total }))
  }, [])

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom: Math.max(0.25, Math.min(3.0, zoom)), fitMode: 'none' }))
  }, [])

  const setFitMode = useCallback((fitMode: ViewerState['fitMode']) => {
    setState((prev) => ({ ...prev, fitMode }))
  }, [])

  const rotateClockwise = useCallback(() => {
    setState((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))
  }, [])

  const toggleHighlightTool = useCallback(() => {
    setState((prev) => ({
      ...prev,
      highlightToolActive: !prev.highlightToolActive,
      commentToolActive: false,
    }))
  }, [])

  const toggleCommentTool = useCallback(() => {
    setState((prev) => ({
      ...prev,
      commentToolActive: !prev.commentToolActive,
      highlightToolActive: false,
    }))
  }, [])

  const setFindQuery = useCallback((q: string) => {
    setState((prev) => ({ ...prev, findQuery: q }))
  }, [])

  const toggleFullscreen = useCallback(() => {
    setState((prev) => ({ ...prev, isFullscreen: !prev.isFullscreen }))
  }, [])

  const toggleAnnotationsPanel = useCallback(() => {
    setState((prev) => ({ ...prev, showAnnotationsPanel: !prev.showAnnotationsPanel }))
  }, [])

  const setTxtFontSize = useCallback((size: number) => {
    setState((prev) => ({ ...prev, txtFontSize: Math.max(12, Math.min(28, size)) }))
  }, [])

  const update = useCallback((updates: Partial<ViewerState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  return {
    state,
    setActiveFile,
    setPage,
    setTotalPages,
    setZoom,
    setFitMode,
    rotateClockwise,
    toggleHighlightTool,
    toggleCommentTool,
    setFindQuery,
    toggleFullscreen,
    toggleAnnotationsPanel,
    setTxtFontSize,
    update,
  }
}
