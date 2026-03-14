import asyncio
import uuid
import structlog

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import get_settings
from app.services.ingestion.service import IngestionService

logger = structlog.get_logger(__name__)

# Track running background tasks so they aren't garbage-collected
_background_tasks: set[asyncio.Task] = set()


async def _run_ingestion(file_id: str, job_id: str) -> None:
    from app.db.session import engine, AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as session:
            service = IngestionService(session)
            await service.process_file(uuid.UUID(file_id), uuid.UUID(job_id))
    except Exception:
        logger.exception("Background ingestion failed", file_id=file_id, job_id=job_id)


def dispatch_process_file(file_id: str, job_id: str) -> None:
    """Fire-and-forget async ingestion task."""
    task = asyncio.get_event_loop().create_task(
        _run_ingestion(file_id, job_id),
        name=f"ingest-{file_id}",
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
