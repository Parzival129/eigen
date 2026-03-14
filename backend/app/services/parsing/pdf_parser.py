import asyncio
from concurrent.futures import ProcessPoolExecutor
from functools import partial

from app.services.parsing.base import DocumentParser, ParsedChunk
from app.utils.text_utils import clean_text
from app.core.logging import get_logger

logger = get_logger(__name__)

# Shared process pool for PDF extraction — reused across requests
_pdf_pool = ProcessPoolExecutor()


def _extract_page_range(file_path: str, start: int, end: int) -> list[tuple[int, str]]:
    """Extract text from a range of pages in a subprocess. Returns list of (page_num, text)."""
    import pymupdf

    results: list[tuple[int, str]] = []
    doc = pymupdf.open(file_path)
    for page_num in range(start, min(end, len(doc))):
        text = doc[page_num].get_text()
        results.append((page_num + 1, text))  # 1-indexed
    doc.close()
    return results


class PdfParser(DocumentParser):
    PAGES_PER_WORKER = 100

    async def parse(self, file_path: str) -> list[ParsedChunk]:
        import pymupdf

        doc = pymupdf.open(file_path)
        total_pages = len(doc)
        doc.close()

        logger.info("Parsing PDF", file_path=file_path, total_pages=total_pages)

        loop = asyncio.get_running_loop()

        if total_pages <= self.PAGES_PER_WORKER:
            # Small PDF — single worker, no overhead
            raw_results = await loop.run_in_executor(
                _pdf_pool,
                partial(_extract_page_range, file_path, 0, total_pages),
            )
            all_pages = raw_results
        else:
            # Large PDF — split across workers
            ranges = []
            for start in range(0, total_pages, self.PAGES_PER_WORKER):
                end = min(start + self.PAGES_PER_WORKER, total_pages)
                ranges.append((start, end))

            logger.info(
                "Splitting PDF extraction across workers",
                total_pages=total_pages,
                workers=len(ranges),
                pages_per_worker=self.PAGES_PER_WORKER,
            )

            futures = [
                loop.run_in_executor(
                    _pdf_pool,
                    partial(_extract_page_range, file_path, start, end),
                )
                for start, end in ranges
            ]
            worker_results = await asyncio.gather(*futures)
            all_pages = [page for batch in worker_results for page in batch]

        # Build chunks from extracted text
        chunks = []
        empty_pages = 0
        for page_num, text in all_pages:
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
