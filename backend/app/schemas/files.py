import uuid
from datetime import datetime
from pydantic import BaseModel


class FileListItem(BaseModel):
    file_id: uuid.UUID
    name: str
    file_type: str
    status: str
    total_chunks: int | None
    created_at: datetime


class ChunkDetail(BaseModel):
    chunk_id: uuid.UUID
    chunk_index: int
    chunk_text: str
    page_number: int | None
    chapter: str | None
    section: str | None
    start_time: float | None
    end_time: float | None
    token_count: int | None


class FileDetail(BaseModel):
    file_id: uuid.UUID
    name: str
    file_type: str
    file_size: int
    status: str
    total_chunks: int | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    chunks: list[ChunkDetail] = []
