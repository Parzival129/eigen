export type FileType = 'pdf' | 'txt' | 'epub' | 'mp4'

export type FileStatus = 'uploading' | 'indexed' | 'error'

export interface UploadedFile {
  id: string
  name: string
  type: FileType
  size: number
  status: FileStatus
  errorMessage?: string
  file: File
  objectUrl?: string
}

export interface Annotation {
  id: string
  fileId: string
  type: 'highlight' | 'note'
  color: string
  pageNumber?: number
  boundingRect?: {
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
    pageNumber: number
  }
  text: string
  comment?: string
  createdAt: string
  /** Character start offset in the document (for TXT) */
  charStart?: number
  /** Character end offset in the document (for TXT) */
  charEnd?: number
  /** Highlight overlay rects relative to page (for PDF) */
  highlightRects?: Array<{ left: number; top: number; width: number; height: number }>
}

export interface SearchResult {
  id: string
  fileId: string
  fileName: string
  fileType: FileType
  relevanceScore: number
  chunkText: string
  pageNumber?: number
  charOffset?: number
  startTime?: number
  endTime?: number
}

export interface ViewerState {
  activeFileId: string | null
  page: number
  totalPages: number
  zoom: number
  rotation: number
  fitMode: 'width' | 'page' | 'none'
  highlightToolActive: boolean
  commentToolActive: boolean
  findQuery: string
  isFullscreen: boolean
  showAnnotationsPanel: boolean
  txtFontSize: number
  seekTime?: number
}

export interface SearchState {
  query: string
  scopeFileId: string | null
  results: SearchResult[]
  isLoading: boolean
  hasSearched: boolean
}

export interface AppState {
  files: UploadedFile[]
  viewer: ViewerState
  search: SearchState
  annotations: Annotation[]
  isDarkMode: boolean
  activeSearchHighlight: SearchResult | null
}
