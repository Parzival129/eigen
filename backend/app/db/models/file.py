import uuid
import enum
from sqlalchemy import String, Integer, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin


class FileStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class FileType(str, enum.Enum):
    pdf = "pdf"
    txt = "txt"
    epub = "epub"
    mp4 = "mp4"


class File(Base, TimestampMixin):
    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    sanitized_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=FileStatus.pending, nullable=False)
    error_message: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    total_chunks: Mapped[int | None] = mapped_column(Integer, nullable=True)

    chunks = relationship("Chunk", back_populates="file", cascade="all, delete-orphan")
    jobs = relationship("IngestionJob", back_populates="file", cascade="all, delete-orphan")
