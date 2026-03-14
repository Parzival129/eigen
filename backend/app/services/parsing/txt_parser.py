import aiofiles
from app.services.parsing.base import DocumentParser, ParsedChunk
from app.utils.text_utils import clean_text
from app.core.logging import get_logger

logger = get_logger(__name__)


class TxtParser(DocumentParser):
    async def parse(self, file_path: str) -> list[ParsedChunk]:
        logger.info("Parsing text file", file_path=file_path)
        async with aiofiles.open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = await f.read()
        raw_length = len(content)
        content = clean_text(content)
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        logger.info(
            "Text parsing complete",
            file_path=file_path,
            raw_characters=raw_length,
            paragraphs=len(paragraphs),
        )
        return [ParsedChunk(text=para) for para in paragraphs]
