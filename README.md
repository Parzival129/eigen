![Eigen](assets/eigen-banner-v2.png)

# Eigen

A semantic document search platform for educational content.

## What is Eigen?

Eigen is a full-stack semantic search platform designed for educational content. It supports uploading and searching across multiple document formats — PDF, EPUB, video, images, and plain text. Documents are processed, chunked, and embedded using OpenAI embeddings, then stored in ChromaDB for fast vector similarity search. Google Gemini powers LLM features like AI-generated summaries and quizzes. The search pipeline is orchestrated by Railtracks, providing a clean, composable execution model.

## Features

- Multi-format file upload (PDF, EPUB, MP4, images, TXT)
- Semantic vector search powered by OpenAI embeddings + ChromaDB
- AI-generated summaries and quizzes via Google Gemini
- Inline document viewer (PDF with toolbar/zoom/rotation, EPUB, video, text)
- Text annotations with selection popover
- Dark mode with a custom warm design system
- Rate limiting and structured logging

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python 3, FastAPI, SQLAlchemy (async), Alembic, ChromaDB, OpenAI, Google Gemini, **Railtracks**, PyMuPDF, ebooklib, moviepy |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 4, react-pdf, epubjs, KaTeX, Lucide icons |

### Railtracks

Railtracks powers the search pipeline. Search steps are defined as `@rt.function_node` decorated functions (`embed_query_node` → `vector_search_node`) and executed within a `rt.Session()` using `rt.call()`. See `backend/app/services/search/pipeline.py` and `backend/app/services/search/service.py`.

## Project Structure

```
eigen/
├── assets/                  # Banner and static assets
├── backend/
│   ├── app/
│   │   ├── api/routes/      # FastAPI route handlers
│   │   ├── core/            # Config, logging, security
│   │   ├── db/models/       # SQLAlchemy models (File, Chunk, IngestionJob)
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── services/        # Business logic
│   │   │   ├── search/      # Railtracks-powered vector search
│   │   │   ├── embeddings/  # OpenAI embedding provider
│   │   │   ├── chroma/      # ChromaDB client
│   │   │   ├── ingestion/   # File processing pipeline
│   │   │   ├── parsing/     # PDF, EPUB, video, image extraction
│   │   │   ├── chunking/    # Text segmentation
│   │   │   └── llm/         # Gemini summarize/quiz
│   │   ├── workers/         # Background job dispatch
│   │   └── utils/           # Helpers
│   ├── alembic/             # DB migrations
│   ├── Makefile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── api/             # Backend API client
│   │   ├── components/
│   │   │   ├── search/      # SearchBar, ResultCard, SummaryPanel, QuizPanel
│   │   │   ├── sidebar/     # FileManager, FileListItem
│   │   │   └── viewer/      # PDFViewer, EPUBViewer, VideoViewer, TXTViewer, AnnotationPanel
│   │   ├── hooks/           # useAnnotations, useViewerState
│   │   └── types/           # TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
└── testing/                 # Test files
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm

### Backend

```bash
cd backend
cp .env.example .env        # Fill in OPENAI_API_KEY, GEMINI_API_KEY, etc.
make install
make migrate
make run                     # Starts on http://localhost:8000
```

### Frontend

```bash
cd frontend
cp .env.example .env        # Set VITE_API_URL=http://localhost:8000
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/ingest/upload` | Upload a file |
| GET | `/api/v1/ingest/status/{job_id}` | Ingestion job status |
| POST | `/api/v1/search` | Semantic vector search |
| GET | `/api/v1/files` | List all files |
| GET | `/api/v1/files/{file_id}` | File details with chunks |
| GET | `/api/v1/files/{file_id}/content` | Download/view file |
| DELETE | `/api/v1/files/{file_id}` | Delete a file |
| POST | `/api/v1/files/{file_id}/reindex` | Reindex file chunks |
| POST | `/api/v1/llm/summarize` | AI summary |
| POST | `/api/v1/llm/quiz` | AI quiz generation |

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for embeddings |
| `GEMINI_API_KEY` | Google Gemini API key for summaries/quizzes |
| `DATABASE_URL` | SQLAlchemy async database URL |
| `CHROMA_PERSIST_PATH` | Path for ChromaDB persistent storage |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:8000`) |

## Running Tests

```bash
# Backend
cd backend
make test          # Runs pytest

# Frontend
cd frontend
npm run lint       # Runs ESLint
```

## Team

Russell Tabata, Dinu Dassanayake, Samarvir Garg, Harshit Jain
