from pathlib import Path
import pymupdf
from app.core.logging import get_logger

logger = get_logger(__name__)


def convert_epub_to_pdf(epub_path: str) -> str:
    """Convert an EPUB file to PDF using PyMuPDF. Returns the PDF path."""
    epub = Path(epub_path)
    pdf_path = epub.with_suffix(".pdf")

    logger.info("Converting EPUB to PDF", epub_path=epub_path, pdf_path=str(pdf_path))

    doc = pymupdf.open(epub_path)
    pdf_bytes = doc.convert_to_pdf()
    doc.close()

    pdf_path.write_bytes(pdf_bytes)

    logger.info("EPUB converted to PDF", pdf_path=str(pdf_path), size_bytes=len(pdf_bytes))
    return str(pdf_path)
