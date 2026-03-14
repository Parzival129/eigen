import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.file import File, FileStatus
from app.db.models.chunk import Chunk as ChunkModel
from app.db.models.job import IngestionJob
from app.services.embeddings.openai_provider import OpenAIEmbeddingProvider
from app.services.chunking.chunker import chunk_parsed_content
from app.services.chroma.client import get_chroma_collection
from app.services.chroma.repository import index_chunks
from app.core.logging import get_logger

logger = get_logger(__name__)


def _get_parser(file_type: str):
    if file_type == "pdf":
        from app.services.parsing.pdf_parser import PdfParser
        return PdfParser()
    elif file_type == "txt":
        from app.services.parsing.txt_parser import TxtParser
        return TxtParser()
    elif file_type == "epub":
        from app.services.parsing.epub_parser import EpubParser
        return EpubParser()
    elif file_type == "mp4":
        from app.services.parsing.mp4_parser import Mp4Parser
        return Mp4Parser()
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


class IngestionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.embedder = OpenAIEmbeddingProvider()

    async def process_file(self, file_id: uuid.UUID, job_id: uuid.UUID) -> None:
        # Update job status to started
        job = await self.db.get(IngestionJob, job_id)
        file = await self.db.get(File, file_id)

        if not job or not file:
            raise ValueError(f"Job {job_id} or File {file_id} not found")

        logger.info(
            "Ingestion started",
            file_id=str(file_id),
            job_id=str(job_id),
            filename=file.original_filename,
            file_type=file.file_type,
            file_size=file.file_size,
        )
        job.status = "started"
        job.started_at = datetime.now(timezone.utc)
        file.status = FileStatus.processing
        await self.db.commit()

        try:
            # Parse
            parser = _get_parser(file.file_type)
            logger.info(
                "Parsing file",
                file_id=str(file_id),
                parser=type(parser).__name__,
                storage_path=file.storage_path,
            )
            parsed = await parser.parse(file.storage_path)
            total_chars = sum(len(p.text) for p in parsed)
            logger.info(
                "Parsing complete",
                file_id=str(file_id),
                parsed_sections=len(parsed),
                total_characters=total_chars,
            )

            if not parsed:
                logger.warning(
                    "Parser returned 0 sections — file may be empty or unsupported format",
                    file_id=str(file_id),
                    file_type=file.file_type,
                )

            # Chunk
            logger.info("Chunking parsed content", file_id=str(file_id), input_sections=len(parsed))
            chunks = chunk_parsed_content(parsed)
            total_tokens = sum(c.token_count for c in chunks)
            logger.info(
                "Chunking complete",
                file_id=str(file_id),
                chunk_count=len(chunks),
                total_tokens=total_tokens,
                avg_tokens_per_chunk=round(total_tokens / len(chunks)) if chunks else 0,
            )

            if not chunks:
                logger.warning("No chunks produced, skipping indexing", file_id=str(file_id))
                file.status = FileStatus.completed
                file.total_chunks = 0
                job.status = "completed"
                job.completed_at = datetime.now(timezone.utc)
                await self.db.commit()
                return

            # Embed
            texts = [c.text for c in chunks]
            logger.info(
                "Generating embeddings",
                file_id=str(file_id),
                chunk_count=len(texts),
                total_tokens=total_tokens,
            )
            embeddings = await self.embedder.embed_batch(texts)
            logger.info(
                "Embeddings complete",
                file_id=str(file_id),
                embeddings_generated=len(embeddings),
                embedding_dimension=len(embeddings[0]) if embeddings else 0,
            )

            # Store in ChromaDB
            logger.info(
                "Indexing chunks into ChromaDB",
                file_id=str(file_id),
                chunk_count=len(chunks),
            )
            await index_chunks(get_chroma_collection(), str(file_id), file.file_type, chunks, embeddings)

            # Store chunks in DB
            logger.info("Storing chunks in database", file_id=str(file_id), chunk_count=len(chunks))
            chunk_models = []
            for chunk, embedding in zip(chunks, embeddings):
                vector_id = f"{file_id}:{chunk.chunk_index}"
                cm = ChunkModel(
                    id=uuid.uuid4(),
                    file_id=file_id,
                    chunk_index=chunk.chunk_index,
                    chunk_text=chunk.text,
                    vector_id=vector_id,
                    page_number=chunk.page_number,
                    chapter=chunk.chapter,
                    section=chunk.section,
                    start_time=chunk.start_time,
                    end_time=chunk.end_time,
                    heading_context=chunk.heading_context,
                    token_count=chunk.token_count,
                )
                chunk_models.append(cm)

            self.db.add_all(chunk_models)
            file.status = FileStatus.completed
            file.total_chunks = len(chunks)
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            await self.db.commit()

            elapsed = (job.completed_at - job.started_at).total_seconds()
            logger.info(
                "Ingestion complete",
                file_id=str(file_id),
                filename=file.original_filename,
                total_chunks=len(chunks),
                total_tokens=total_tokens,
                elapsed_seconds=round(elapsed, 2),
            )

        except Exception as e:
            logger.error(
                "Ingestion failed",
                file_id=str(file_id),
                filename=file.original_filename,
                error=str(e),
                error_type=type(e).__name__,
                exc_info=True,
            )
            file.status = FileStatus.failed
            file.error_message = str(e)[:2048]
            job.status = "failed"
            job.error_message = str(e)[:2048]
            job.completed_at = datetime.now(timezone.utc)
            await self.db.commit()
            raise
