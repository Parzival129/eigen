import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile, HTTPException
from app.core.logging import get_logger

logger = get_logger(__name__)

ALLOWED_EXTENSIONS = {"pdf", "txt", "epub", "mp4"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "application/epub+zip",
    "video/mp4",
    "video/mpeg",
}


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lstrip(".").lower()


async def save_upload_file(upload_file: UploadFile, upload_dir: str, max_size: int) -> tuple[str, int]:
    """Save uploaded file to disk. Returns (path, size)."""
    ext = get_file_extension(upload_file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        logger.warning(
            "Upload rejected: unsupported file type",
            filename=upload_file.filename,
            extension=ext,
        )
        raise HTTPException(400, f"File type '.{ext}' not allowed. Allowed: {ALLOWED_EXTENSIONS}")

    upload_path = Path(upload_dir)
    upload_path.mkdir(parents=True, exist_ok=True)

    file_id = str(uuid.uuid4())
    dest_path = upload_path / f"{file_id}.{ext}"

    logger.info(
        "Saving upload to disk",
        filename=upload_file.filename,
        content_type=upload_file.content_type,
        destination=str(dest_path),
        max_size_mb=max_size // (1024 * 1024),
    )

    total_size = 0
    async with aiofiles.open(dest_path, "wb") as f:
        while chunk := await upload_file.read(1024 * 1024):  # 1MB chunks
            total_size += len(chunk)
            if total_size > max_size:
                await f.close()
                dest_path.unlink(missing_ok=True)
                logger.warning(
                    "Upload rejected: file too large",
                    filename=upload_file.filename,
                    size_bytes=total_size,
                    max_size_mb=max_size // (1024 * 1024),
                )
                raise HTTPException(413, f"File exceeds maximum size of {max_size // (1024*1024)}MB")
            await f.write(chunk)

    logger.info(
        "Upload saved to disk",
        filename=upload_file.filename,
        size_bytes=total_size,
        size_mb=round(total_size / (1024 * 1024), 2),
        destination=str(dest_path),
    )
    return str(dest_path), total_size


def delete_local_file(path: str) -> None:
    try:
        Path(path).unlink(missing_ok=True)
        logger.info("Local file deleted", path=path)
    except Exception as e:
        logger.warning("Failed to delete local file", path=path, error=str(e))
