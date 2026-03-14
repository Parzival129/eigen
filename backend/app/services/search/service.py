import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import aliased
import railtracks as rt
from app.db.models.chunk import Chunk as ChunkModel
from app.db.models.file import File
from app.schemas.search import SearchRequest, SearchResponse, ChunkResult
from app.services.search.pipeline import embed_query_node, vector_search_node, EmbedResult, VectorSearchResult
from app.core.logging import get_logger

logger = get_logger(__name__)


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(self, request: SearchRequest) -> SearchResponse:
        start = time.time()
        logger.info(
            "Search started",
            query=request.query,
            top_k=request.top_k,
            file_id=str(request.file_id) if request.file_id else None,
        )

        # Run the railtracks pipeline (embed + vector search)
        with rt.Session():
            embed_result: EmbedResult = await rt.call(embed_query_node, request)
            logger.debug("Query embedded", query=request.query, vector_dimension=len(embed_result.vector))
            vector_result: VectorSearchResult = await rt.call(vector_search_node, embed_result)
            logger.debug("Vector search complete", hits=len(vector_result.hits))

        if not vector_result.hits:
            elapsed_ms = (time.time() - start) * 1000
            logger.info("Search returned no results", query=request.query, elapsed_ms=round(elapsed_ms, 2))
            return SearchResponse(
                query=request.query,
                results=[],
                total=0,
                execution_time_ms=elapsed_ms,
            )

        # Extract vector IDs and scores
        vector_id_to_score = {h.vector_id: h.score for h in vector_result.hits}
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

        # Build results preserving ChromaDB score order
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
        logger.info(
            "Search complete",
            query=request.query,
            results=len(results),
            top_score=round(results[0].score, 4) if results else None,
            elapsed_ms=round(elapsed_ms, 2),
        )
        return SearchResponse(
            query=request.query,
            results=results,
            total=len(results),
            execution_time_ms=elapsed_ms,
        )
