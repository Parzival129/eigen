from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ParsedChunk:
    text: str
    chunk_index: int = 0
    page_number: int | None = None
    chapter: str | None = None
    section: str | None = None
    start_time: float | None = None
    end_time: float | None = None
    heading_context: str | None = None


class DocumentParser(ABC):
    @abstractmethod
    async def parse(self, file_path: str) -> list[ParsedChunk]:
        ...
