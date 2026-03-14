import uuid
from fastapi import APIRouter, UploadFile, File, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import limiter
from app.db.session import get_db
from app.db.models.file import File as FileModel, FileStatus
from app.db.models.job import IngestionJob
from app.schemas.ingest import UploadResponse, JobStatusResponse
from app.utils.file_utils import save_upload_file, get_file_extension
from app.core.config import get_settings
from app.core.security import sanitize_filename
from app.workers.tasks import dispatch_process_file
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/ingest/upload", response_model=UploadResponse)
@limiter.limit("60/minute")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    logger.info(
        "Upload received",
        filename=file.filename,
        content_type=file.content_type,
    )
    path, size = await save_upload_file(file, settings.upload_dir, settings.max_file_size_bytes)
    ext = get_file_extension(file.filename or "")
    sanitized = sanitize_filename(file.filename or "upload")
    logger.info(
        "File saved to disk",
        filename=file.filename,
        file_type=ext,
        size_bytes=size,
        storage_path=path,
    )

    file_record = FileModel(
        id=uuid.uuid4(),
        original_filename=file.filename or "upload",
        sanitized_filename=sanitized,
        file_type=ext,
        file_size=size,
        storage_path=path,
        status=FileStatus.pending,
    )
    db.add(file_record)

    job = IngestionJob(
        id=uuid.uuid4(),
        file_id=file_record.id,
        status="queued",
    )
    db.add(job)
    await db.commit()

    # Dispatch background task
    logger.info(
        "Dispatching ingestion job",
        file_id=str(file_record.id),
        job_id=str(job.id),
        filename=file.filename,
    )
    dispatch_process_file(str(file_record.id), str(job.id))

    return UploadResponse(
        file_id=file_record.id,
        job_id=job.id,
        status="queued",
        message="File uploaded and queued for processing",
    )


@router.get("/ingest/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    job = await db.get(IngestionJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return JobStatusResponse(
        job_id=job.id,
        file_id=job.file_id,
        status=job.status,
        started_at=job.started_at,
        completed_at=job.completed_at,
        error_message=job.error_message,
        created_at=job.created_at,
    )
