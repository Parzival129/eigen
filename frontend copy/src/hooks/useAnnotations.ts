import { useState, useCallback } from 'react'
import type { Annotation } from '../types'

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([])

  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id' | 'createdAt'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    setAnnotations((prev) => [...prev, newAnnotation])
    return newAnnotation
  }, [])

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)))
  }, [])

  const getAnnotationsForFile = useCallback(
    (fileId: string) => annotations.filter((a) => a.fileId === fileId),
    [annotations]
  )

  const clearAnnotationsForFile = useCallback((fileId: string) => {
    setAnnotations((prev) => prev.filter((a) => a.fileId !== fileId))
  }, [])

  return {
    annotations,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    getAnnotationsForFile,
    clearAnnotationsForFile,
  }
}
