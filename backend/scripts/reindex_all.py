"""
One-time migration: clears stale Moorcheh vector references and resets all completed
files to pending so they re-ingest into ChromaDB on next server startup.

Run from the backend/ directory:
    python scripts/reindex_all.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import update, delete as sqldelete
from app.db.session import AsyncSessionLocal
from app.db.models.file import File, FileStatus
from app.db.models.chunk import Chunk
from app.db.models.job import IngestionJob


async def main():
    async with AsyncSessionLocal() as session:
        # Delete all existing chunks (vector_ids now point to deleted Moorcheh)
        await session.execute(sqldelete(Chunk))

        # Delete all existing ingestion jobs
        await session.execute(sqldelete(IngestionJob))

        # Reset all completed/failed files to pending
        await session.execute(
            update(File)
            .where(File.status.in_([FileStatus.completed, FileStatus.failed]))
            .values(status=FileStatus.pending, total_chunks=None, error_message=None)
        )
        await session.commit()

    print("Done. Re-upload your files or restart the server and re-trigger ingestion.")


asyncio.run(main())
