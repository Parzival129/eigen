from pypdf import PdfReader
from app.services.parsing.base import DocumentParser, ParsedChunk
from app.utils.text_utils import clean_text


class PdfParser(DocumentParser):
    async def parse(self, file_path: str) -> list[ParsedChunk]:
        reader = PdfReader(file_path)
        chunks = []
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            text = clean_text(text)
            if text.strip():
                chunks.append(ParsedChunk(
                    text=text,
                    page_number=page_num,
                    heading_context=f"Page {page_num}",
                ))
        return chunks
