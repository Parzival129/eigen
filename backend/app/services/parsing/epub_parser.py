import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from app.services.parsing.base import DocumentParser, ParsedChunk
from app.utils.text_utils import clean_text
from app.core.logging import get_logger

logger = get_logger(__name__)


class EpubParser(DocumentParser):
    async def parse(self, file_path: str) -> list[ParsedChunk]:
        book = epub.read_epub(file_path)
        chunks = self._extract_items(book, ebooklib.ITEM_DOCUMENT)

        if not chunks:
            logger.warning(
                "No ITEM_DOCUMENT items found, falling back to all items",
                file_path=file_path,
            )
            chunks = self._extract_items(book, None)

        if not chunks:
            logger.warning("EPUB produced 0 parsed sections", file_path=file_path)

        return chunks

    def _extract_items(self, book: epub.EpubBook, item_type) -> list[ParsedChunk]:
        items = (
            book.get_items_of_type(item_type)
            if item_type is not None
            else book.get_items()
        )
        chunks = []
        chapter_num = 0
        for item in items:
            try:
                raw = item.get_content()
                if not raw:
                    continue
                content = raw.decode("utf-8", errors="replace")
                soup = BeautifulSoup(content, "html.parser")
                text = clean_text(soup.get_text(separator="\n"))
                if not text.strip():
                    continue

                chapter_num += 1
                chapter_title = None
                heading = soup.find(["h1", "h2", "h3"])
                if heading:
                    chapter_title = heading.get_text(strip=True)

                chunks.append(ParsedChunk(
                    text=text,
                    chapter=chapter_title or f"Chapter {chapter_num}",
                    heading_context=chapter_title,
                ))
            except Exception:
                logger.warning(
                    "Failed to parse EPUB item, skipping",
                    item_name=getattr(item, "file_name", "unknown"),
                    exc_info=True,
                )
        return chunks
