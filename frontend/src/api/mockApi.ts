// TODO: Replace these stubs with REST API calls to the backend
// POST /embed  → uploadFiles
// POST /search → searchDocuments

import type { SearchResult } from '../types'

const MOCK_CHUNKS: Record<string, string[]> = {
  pdf: [
    'Eigenvalues and eigenvectors are fundamental concepts in linear algebra. An eigenvector of a linear transformation is a nonzero vector that only changes by a scalar factor when that transformation is applied. The scalar factor is the eigenvalue.',
    'The characteristic polynomial of a matrix A is defined as det(A - λI) = 0. The roots of this polynomial are the eigenvalues of the matrix. For an n×n matrix, there are exactly n eigenvalues counted with multiplicity.',
    'Principal Component Analysis (PCA) relies heavily on the eigendecomposition of the covariance matrix. The principal components are the eigenvectors corresponding to the largest eigenvalues, capturing the directions of maximum variance in the data.',
    'The spectral theorem states that every real symmetric matrix is orthogonally diagonalizable. That is, A = QΛQᵀ where Q is an orthogonal matrix whose columns are the eigenvectors, and Λ is the diagonal matrix of eigenvalues.',
    'In quantum mechanics, observable quantities are represented by Hermitian operators. The eigenvalues of such operators correspond to the possible measurement outcomes, while the eigenstates represent the states of definite value for that observable.',
  ],
  txt: [
    'Semantic search goes beyond keyword matching by understanding the meaning and context of words. Unlike traditional search that looks for exact term matches, semantic search uses vector embeddings to find conceptually similar content.',
    'Vector databases store high-dimensional embeddings and support approximate nearest neighbor search. Common algorithms include HNSW (Hierarchical Navigable Small World) and IVF (Inverted File Index), both offering sub-linear query time.',
    'Transformer models like BERT and its variants generate contextual embeddings where the representation of each word depends on its surrounding context. This makes them far more powerful than static word embeddings like Word2Vec.',
    'Retrieval-Augmented Generation (RAG) combines a retrieval component with a generative language model. The retrieval step fetches relevant chunks from a document corpus, which are then provided as context to the generator.',
  ],
  epub: [
    'Information retrieval systems have evolved from Boolean models through vector space models to modern neural approaches. The journey reflects our growing understanding of how humans express and process meaning in language.',
    'The inverted index is the backbone of traditional search engines. For each term in the vocabulary, it stores a list of documents containing that term along with positional information, enabling fast lookup and ranking.',
  ],
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomScore(base: number): number {
  return Math.min(0.99, base + (Math.random() * 0.1 - 0.05))
}

export interface UploadedFileResult {
  fileId: string
  name: string
  type: string
}

export async function uploadFiles(files: File[]): Promise<UploadedFileResult[]> {
  await delay(800 + Math.random() * 400)
  return files.map((f) => ({
    fileId: crypto.randomUUID(),
    name: f.name,
    type: f.name.endsWith('.pdf') ? 'pdf' : f.name.endsWith('.epub') ? 'epub' : 'txt',
  }))
}

export async function searchDocuments(
  query: string,
  fileIds: string[],
  files: Array<{ id: string; name: string; type: string }>
): Promise<SearchResult[]> {
  await delay(1400 + Math.random() * 400)

  const queryLower = query.toLowerCase()
  const targetFiles = fileIds.length > 0 ? files.filter((f) => fileIds.includes(f.id)) : files

  const results: SearchResult[] = []

  for (const file of targetFiles) {
    const chunks = MOCK_CHUNKS[file.type] ?? MOCK_CHUNKS.txt
    const numResults = Math.floor(Math.random() * 2) + 1

    for (let i = 0; i < numResults; i++) {
      const chunkIndex = Math.floor(Math.random() * chunks.length)
      const chunk = chunks[chunkIndex]
      const words = queryLower.split(' ')
      const baseScore = words.some((w) => chunk.toLowerCase().includes(w)) ? 0.75 : 0.45

      results.push({
        id: crypto.randomUUID(),
        fileId: file.id,
        fileName: file.name,
        fileType: file.type as 'pdf' | 'txt' | 'epub',
        relevanceScore: randomScore(baseScore),
        chunkText: chunk,
        pageNumber: file.type === 'pdf' ? Math.floor(Math.random() * 20) + 1 : undefined,
        charOffset: file.type !== 'pdf' ? Math.floor(Math.random() * 2000) : undefined,
      })
    }
  }

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
}
