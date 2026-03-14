import uuid
from datetime import datetime
from pydantic import BaseModel


class UploadResponse(BaseModel):
    file_id: uuid.UUID
    job_id: uuid.UUID
    status: str
    message: str


class JobStatusResponse(BaseModel):
    job_id: uuid.UUID
    file_id: uuid.UUID
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime
