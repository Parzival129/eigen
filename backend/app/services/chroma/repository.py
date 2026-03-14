import asyncio
import chromadb
from app.services.chunking.chunker import Chunk
from app.core.logging import get_logger

logger = get_logger(__name__)


async def index_chunks(
    collection: chromadb.Collection,
    file_id: str,
    file_type: str,
    chunks: list[Chunk],
    embeddings: list[list[float]],
) -> None:
    ids = [f"{file_id}:{c.chunk_index}" for c in chunks]
    documents = [c.text[:200] for c in chunks]
    metadatas = [
        {"file_id": file_id, "chunk_index": c.chunk_index, "file_type": file_type}
        for c in chunks
    ]
    await asyncio.to_thread(
        collection.upsert,
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )
    logger.info("Indexed chunks into ChromaDB", file_id=file_id, count=len(ids))


async def delete_file_vectors(
    collection: chromadb.Collection,
    file_id: str,
    vector_ids: list[str],
) -> None:
    if vector_ids:
        await asyncio.to_thread(collection.delete, ids=vector_ids)
        logger.info("Deleted vectors from ChromaDB", file_id=file_id, count=len(vector_ids))


async def search_similar(
    collection: chromadb.Collection,
    query_vector: list[float],
    top_k: int = 10,
    file_id: str | None = None,
) -> list[dict]:
    kwargs: dict = dict(
        query_embeddings=[query_vector],
        n_results=top_k,
        include=["distances", "metadatas"],
    )
    if file_id:
        kwargs["where"] = {"file_id": file_id}

    result = await asyncio.to_thread(collection.query, **kwargs)

    hits = []
    ids = result.get("ids", [[]])[0]
    distances = result.get("distances", [[]])[0]
    for vid, dist in zip(ids, distances):
        # ChromaDB cosine distance: 0 = identical, 2 = opposite → convert to similarity
        hits.append({"id": vid, "score": 1.0 - dist})
    return hits
