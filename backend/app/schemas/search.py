import uuid
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(default=10, ge=1, le=50)
    file_id: uuid.UUID | None = None


class ChunkResult(BaseModel):
    chunk_id: uuid.UUID
    file_id: uuid.UUID
    file_name: str
    file_type: str
    chunk_text: str
    score: float
    page_number: int | None = None
    chapter: str | None = None
    section: str | None = None
    start_time: float | None = None
    end_time: float | None = None
    heading_context: str | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[ChunkResult]
    total: int
    execution_time_ms: float
