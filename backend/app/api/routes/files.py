import uuid
import os
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse as FastFileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models.file import File as FileModel, FileStatus
from app.db.models.chunk import Chunk as ChunkModel
from app.db.models.job import IngestionJob
from app.schemas.files import FileListItem, FileDetail, ChunkDetail
from app.schemas.common import SuccessResponse
from app.services.chroma.client import get_chroma_collection
from app.services.chroma.repository import delete_file_vectors
from app.utils.file_utils import delete_local_file
from app.utils.epub_converter import convert_epub_to_pdf
from app.workers.tasks import dispatch_process_file
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/files", response_model=list[FileListItem])
async def list_files(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FileModel).order_by(FileModel.created_at.desc()))
    files = result.scalars().all()
    return [
        FileListItem(
            file_id=f.id,
            name=f.original_filename,
            file_type=f.file_type,
            status=f.status,
            total_chunks=f.total_chunks,
            created_at=f.created_at,
        )
        for f in files
    ]


@router.get("/files/{file_id}/content")
async def serve_file(file_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    file = await db.get(FileModel, file_id)
    if not file:
        raise HTTPException(404, "File not found")
    if not os.path.exists(file.storage_path):
        raise HTTPException(404, "File not found on disk")

    # Serve converted PDF for EPUB files
    if file.file_type == "epub":
        # Lazy conversion fallback for EPUBs uploaded before this feature
        if not file.pdf_storage_path or not os.path.exists(file.pdf_storage_path):
            try:
                pdf_path = await asyncio.to_thread(convert_epub_to_pdf, file.storage_path)
                file.pdf_storage_path = pdf_path
                await db.commit()
            except Exception:
                logger.warning("EPUB lazy conversion failed", file_id=str(file_id))
                raise HTTPException(500, "EPUB conversion failed")

        if file.pdf_storage_path and os.path.exists(file.pdf_storage_path):
            return FastFileResponse(
                path=file.pdf_storage_path,
                filename=file.original_filename.rsplit(".", 1)[0] + ".pdf",
                media_type="application/pdf",
            )

        raise HTTPException(500, "EPUB conversion failed")

    return FastFileResponse(
        path=file.storage_path,
        filename=file.original_filename,
        media_type="application/octet-stream",
    )


@router.get("/files/{file_id}", response_model=FileDetail)
async def get_file(file_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    file = await db.get(FileModel, file_id)
    if not file:
        raise HTTPException(404, "File not found")

    result = await db.execute(
        select(ChunkModel)
        .where(ChunkModel.file_id == file_id)
        .order_by(ChunkModel.chunk_index)
    )
    chunks = result.scalars().all()

    return FileDetail(
        file_id=file.id,
        name=file.original_filename,
        file_type=file.file_type,
        file_size=file.file_size,
        status=file.status,
        total_chunks=file.total_chunks,
        error_message=file.error_message,
        created_at=file.created_at,
        updated_at=file.updated_at,
        chunks=[
            ChunkDetail(
                chunk_id=c.id,
                chunk_index=c.chunk_index,
                chunk_text=c.chunk_text,
                page_number=c.page_number,
                chapter=c.chapter,
                section=c.section,
                start_time=c.start_time,
                end_time=c.end_time,
                token_count=c.token_count,
            )
            for c in chunks
        ],
    )


@router.delete("/files/{file_id}", response_model=SuccessResponse)
async def delete_file(file_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    logger.info("File deletion requested", file_id=str(file_id))
    file = await db.get(FileModel, file_id)
    if not file:
        raise HTTPException(404, "File not found")

    # Get all vector IDs
    result = await db.execute(select(ChunkModel.vector_id).where(ChunkModel.file_id == file_id))
    vector_ids = [row[0] for row in result.all()]

    # Delete from ChromaDB
    logger.info("Deleting vectors from ChromaDB", file_id=str(file_id), vector_count=len(vector_ids))
    await delete_file_vectors(get_chroma_collection(), str(file_id), vector_ids)

    # Delete local file(s)
    logger.info("Deleting local file", file_id=str(file_id), storage_path=file.storage_path)
    delete_local_file(file.storage_path)
    if file.pdf_storage_path:
        delete_local_file(file.pdf_storage_path)

    # Delete DB record (cascades to chunks and jobs)
    await db.delete(file)
    await db.commit()

    logger.info(
        "File deleted",
        file_id=str(file_id),
        filename=file.original_filename,
        vectors_removed=len(vector_ids),
    )
    return SuccessResponse(message=f"File {file_id} deleted successfully")


@router.post("/files/{file_id}/reindex")
async def reindex_file(file_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    logger.info("Reindex requested", file_id=str(file_id))
    file = await db.get(FileModel, file_id)
    if not file:
        raise HTTPException(404, "File not found")

    # Delete existing chunks and vectors
    result = await db.execute(select(ChunkModel.vector_id).where(ChunkModel.file_id == file_id))
    vector_ids = [row[0] for row in result.all()]

    logger.info(
        "Clearing existing data for reindex",
        file_id=str(file_id),
        filename=file.original_filename,
        existing_vectors=len(vector_ids),
    )
    await delete_file_vectors(get_chroma_collection(), str(file_id), vector_ids)

    # Delete chunks from DB
    result = await db.execute(select(ChunkModel).where(ChunkModel.file_id == file_id))
    for chunk in result.scalars().all():
        await db.delete(chunk)

    # Create new job
    job = IngestionJob(
        id=uuid.uuid4(),
        file_id=file_id,
        status="queued",
    )
    db.add(job)
    file.status = FileStatus.pending
    await db.commit()

    logger.info(
        "Reindex job dispatched",
        file_id=str(file_id),
        job_id=str(job.id),
        filename=file.original_filename,
    )
    dispatch_process_file(str(file_id), str(job.id))

    return {"job_id": str(job.id)}
