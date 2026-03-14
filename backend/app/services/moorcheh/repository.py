from moorcheh_sdk import AsyncMoorchehClient
from app.services.moorcheh.client import ensure_namespace
from app.services.chunking.chunker import Chunk
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def index_chunks(
    client: AsyncMoorchehClient,
    file_id: str,
    file_type: str,
    chunks: list[Chunk],
    embeddings: list[list[float]],
) -> None:
    settings = get_settings()
    namespace = settings.moorcheh_namespace
    await ensure_namespace(client, namespace)

    vectors = []
    for chunk, embedding in zip(chunks, embeddings):
        vector_id = f"{file_id}:{chunk.chunk_index}"
        vectors.append({
            "id": vector_id,
            "vector": embedding,
            "file_id": file_id,
            "chunk_index": chunk.chunk_index,
            "file_type": file_type,
            "text_preview": chunk.text[:200],
        })

    await client.vectors.upload(namespace, vectors)
    logger.info("Indexed chunks", file_id=file_id, count=len(vectors))


async def delete_file_vectors(
    client: AsyncMoorchehClient,
    file_id: str,
    vector_ids: list[str],
) -> None:
    settings = get_settings()
    namespace = settings.moorcheh_namespace
    if vector_ids:
        await client.vectors.delete(namespace, vector_ids)
        logger.info("Deleted vectors", file_id=file_id, count=len(vector_ids))


async def search_similar(
    client: AsyncMoorchehClient,
    query_vector: list[float],
    top_k: int = 10,
) -> list[dict]:
    settings = get_settings()
    namespace = settings.moorcheh_namespace
    response = await client.search.query(
        namespaces=[namespace],
        query=query_vector,
        top_k=top_k,
    )
    return response.get("results", [])
