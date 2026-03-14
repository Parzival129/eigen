from pypdf import PdfReader
from app.services.parsing.base import DocumentParser, ParsedChunk
from app.utils.text_utils import clean_text
from app.core.logging import get_logger

logger = get_logger(__name__)


class PdfParser(DocumentParser):
    async def parse(self, file_path: str) -> list[ParsedChunk]:
        reader = PdfReader(file_path)
        total_pages = len(reader.pages)
        logger.info("Parsing PDF", file_path=file_path, total_pages=total_pages)
        chunks = []
        empty_pages = 0
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            text = clean_text(text)
            if text.strip():
                chunks.append(ParsedChunk(
                    text=text,
                    page_number=page_num,
                    heading_context=f"Page {page_num}",
                ))
            else:
                empty_pages += 1
        logger.info(
            "PDF parsing complete",
            file_path=file_path,
            total_pages=total_pages,
            pages_with_text=len(chunks),
            empty_pages=empty_pages,
            total_characters=sum(len(c.text) for c in chunks),
        )
        return chunks
