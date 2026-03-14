from dataclasses import dataclass
import railtracks as rt
from app.schemas.search import SearchRequest
from app.services.embeddings.openai_provider import OpenAIEmbeddingProvider
from app.services.chroma.client import get_chroma_collection
from app.services.chroma.repository import search_similar


@dataclass
class EmbedResult:
    query: str
    vector: list[float]
    top_k: int
    file_id: str | None


@dataclass
class VectorHit:
    vector_id: str
    score: float


@dataclass
class VectorSearchResult:
    query: str
    hits: list[VectorHit]
    file_id: str | None


@rt.function_node
async def embed_query_node(request: SearchRequest) -> EmbedResult:
    embedder = OpenAIEmbeddingProvider()
    vector = await embedder.embed_text(request.query)
    return EmbedResult(
        query=request.query,
        vector=vector,
        top_k=request.top_k,
        file_id=str(request.file_id) if request.file_id else None,
    )


@rt.function_node
async def vector_search_node(embed_result: EmbedResult) -> VectorSearchResult:
    collection = get_chroma_collection()
    hits_raw = await search_similar(
        collection,
        embed_result.vector,
        top_k=embed_result.top_k,
        file_id=embed_result.file_id,
    )
    hits = [VectorHit(vector_id=h["id"], score=h["score"]) for h in hits_raw]
    return VectorSearchResult(
        query=embed_result.query,
        hits=hits,
        file_id=embed_result.file_id,
    )
