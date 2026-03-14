import time
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import aliased
from app.db.models.chunk import Chunk as ChunkModel
from app.db.models.file import File
from app.schemas.search import SearchRequest, SearchResponse, ChunkResult
from app.services.embeddings.openai_provider import OpenAIEmbeddingProvider
from app.services.moorcheh.client import get_moorcheh_client
from app.services.moorcheh.repository import search_similar
from app.core.logging import get_logger

logger = get_logger(__name__)


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.embedder = OpenAIEmbeddingProvider()
        self.moorcheh = get_moorcheh_client()

    async def search(self, request: SearchRequest) -> SearchResponse:
        start = time.time()

        # Embed query
        query_vector = await self.embedder.embed_text(request.query)

        # Search Moorcheh
        moorcheh_results = await search_similar(self.moorcheh, query_vector, top_k=request.top_k)

        if not moorcheh_results:
            return SearchResponse(
                query=request.query,
                results=[],
                total=0,
                execution_time_ms=(time.time() - start) * 1000,
            )

        # Extract vector IDs and scores
        vector_id_to_score = {r["id"]: r["score"] for r in moorcheh_results}
        vector_ids = list(vector_id_to_score.keys())

        # Fetch chunks from DB using explicit column selection to avoid ORM ambiguity
        chunk_alias = aliased(ChunkModel, flat=True)
        file_alias = aliased(File, flat=True)

        stmt = (
            select(chunk_alias, file_alias)
            .join(file_alias, chunk_alias.file_id == file_alias.id)
            .where(chunk_alias.vector_id.in_(vector_ids))
        )
        if request.file_id:
            stmt = stmt.where(file_alias.id == request.file_id)

        result = await self.db.execute(stmt)
        rows = result.all()

        # Build results map: vector_id -> (chunk, file)
        chunk_map: dict[str, tuple[ChunkModel, File]] = {}
        for row in rows:
            chunk_obj = row[0]
            file_obj = row[1]
            chunk_map[chunk_obj.vector_id] = (chunk_obj, file_obj)

        # Build results preserving Moorcheh score order
        results = []
        for vid in vector_ids:
            if vid not in chunk_map:
                continue
            chunk, file = chunk_map[vid]
            results.append(ChunkResult(
                chunk_id=chunk.id,
                file_id=file.id,
                file_name=file.original_filename,
                file_type=file.file_type,
                chunk_text=chunk.chunk_text,
                score=vector_id_to_score[vid],
                page_number=chunk.page_number,
                chapter=chunk.chapter,
                section=chunk.section,
                start_time=chunk.start_time,
                end_time=chunk.end_time,
                heading_context=chunk.heading_context,
            ))

        elapsed_ms = (time.time() - start) * 1000
        return SearchResponse(
            query=request.query,
            results=results,
            total=len(results),
            execution_time_ms=elapsed_ms,
        )
