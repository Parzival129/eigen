import type { FileType, SearchResult, QuizData } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

interface UploadResponse {
  file_id: string
  job_id: string
  status: string
  message: string
}

interface JobStatusResponse {
  job_id: string
  file_id: string
  status: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
}

interface ChunkResult {
  chunk_id: string
  file_id: string
  file_name: string
  file_type: string
  score: number
  chunk_text: string
  page_number?: number
  start_time?: number
  end_time?: number
}

interface SearchResponse {
  query: string
  results: ChunkResult[]
  total: number
  execution_time_ms: number
}

interface FileInfo {
  file_id: string
  original_filename: string
  file_type: string
  file_size: number
  status: string
  created_at: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    let message = body
    try {
      const parsed = JSON.parse(body) as { detail?: unknown }
      if (typeof parsed.detail === 'string') {
        message = parsed.detail
      }
    } catch {
      // Keep original response body if it's not JSON
    }
    throw new Error(`API ${res.status}: ${message}`)
  }
  return res.json()
}

export function uploadFile(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE_URL}/api/v1/ingest/upload`)

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded / e.total)
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        let message = xhr.responseText
        try {
          const parsed = JSON.parse(xhr.responseText)
          if (typeof parsed.detail === 'string') message = parsed.detail
        } catch { /* keep raw */ }
        reject(new Error(`API ${xhr.status}: ${message}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return request<JobStatusResponse>(`/api/v1/ingest/status/${jobId}`)
}

export async function searchDocuments(
  query: string,
  topK?: number,
  fileId?: string
): Promise<SearchResult[]> {
  const body: Record<string, unknown> = { query }
  if (topK != null) body.top_k = topK
  if (fileId) body.file_id = fileId

  const data = await request<SearchResponse>('/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return data.results.map((r) => ({
    id: r.chunk_id,
    fileId: r.file_id,
    fileName: r.file_name,
    fileType: r.file_type as FileType,
    relevanceScore: r.score,
    chunkText: r.chunk_text,
    pageNumber: r.page_number,
    startTime: r.start_time,
    endTime: r.end_time,
  }))
}

export async function deleteFile(fileId: string): Promise<void> {
  await fetch(`${BASE_URL}/api/v1/files/${fileId}`, { method: 'DELETE' })
}

export async function listFiles(): Promise<FileInfo[]> {
  return request<FileInfo[]>('/api/v1/files')
}

export async function generateSummary(query: string, results: SearchResult[]): Promise<string> {
  const data = await request<{ summary: string }>('/api/v1/llm/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      chunks: results.map((r) => ({
        text: r.chunkText,
        page_number: r.pageNumber ?? null,
        file_name: r.fileName,
      })),
    }),
  })
  return data.summary
}

export async function generateQuiz(query: string, results: SearchResult[]): Promise<QuizData> {
  return request<QuizData>('/api/v1/llm/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      chunks: results.map((r) => ({
        text: r.chunkText,
        page_number: r.pageNumber ?? null,
        file_name: r.fileName,
      })),
    }),
  })
}

export async function pollJobUntilDone(
  jobId: string,
  onStatusChange?: (status: string) => void
): Promise<JobStatusResponse> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await getJobStatus(jobId)
    onStatusChange?.(job.status)
    if (job.status === 'completed' || job.status === 'failed') {
      return job
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
}
