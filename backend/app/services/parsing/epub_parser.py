import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from app.services.parsing.base import DocumentParser, ParsedChunk
from app.utils.text_utils import clean_text
from app.core.logging import get_logger

logger = get_logger(__name__)


class EpubParser(DocumentParser):
    async def parse(self, file_path: str) -> list[ParsedChunk]:
        logger.info("Parsing EPUB", file_path=file_path)
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
        else:
            logger.info(
                "EPUB parsing complete",
                file_path=file_path,
                chapters=len(chunks),
                total_characters=sum(len(c.text) for c in chunks),
            )

        return chunks

    def _extract_items(self, book: epub.EpubBook, item_type) -> list[ParsedChunk]:
        items = (
            book.get_items_of_type(item_type)
            if item_type is not None
            else book.get_items()
        )
        chunks = []
        chapter_num = 0
        skipped = 0
        for item in items:
            try:
                raw = item.get_content()
                if not raw:
                    skipped += 1
                    continue
                content = raw.decode("utf-8", errors="replace")
                soup = BeautifulSoup(content, "html.parser")
                text = clean_text(soup.get_text(separator="\n"))
                if not text.strip():
                    skipped += 1
                    continue

                chapter_num += 1
                chapter_title = None
                heading = soup.find(["h1", "h2", "h3"])
                if heading:
                    chapter_title = heading.get_text(strip=True)

                logger.debug(
                    "Extracted EPUB chapter",
                    chapter_num=chapter_num,
                    chapter_title=chapter_title,
                    characters=len(text),
                )
                chunks.append(ParsedChunk(
                    text=text,
                    chapter=chapter_title or f"Chapter {chapter_num}",
                    heading_context=chapter_title,
                ))
            except Exception:
                skipped += 1
                logger.warning(
                    "Failed to parse EPUB item, skipping",
                    item_name=getattr(item, "file_name", "unknown"),
                    exc_info=True,
                )
        if skipped:
            logger.debug("EPUB items skipped", skipped=skipped)
        return chunks
