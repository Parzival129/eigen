import asyncio
import uuid
from celery import Task
from celery.utils.log import get_task_logger
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


class BaseTask(Task):
    abstract = True


@celery_app.task(
    bind=True,
    base=BaseTask,
    name="process_file",
    max_retries=3,
    default_retry_delay=60,
)
def process_file_task(self, file_id: str, job_id: str):
    async def _run():
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
        from app.core.config import get_settings
        from app.services.ingestion.service import IngestionService

        settings = get_settings()
        engine = create_async_engine(settings.database_url, echo=False)
        factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

        async with factory() as session:
            service = IngestionService(session)
            await service.process_file(uuid.UUID(file_id), uuid.UUID(job_id))

        await engine.dispose()

    try:
        asyncio.run(_run())
    except Exception as exc:
        logger.error(f"Task failed: {exc}")
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)
