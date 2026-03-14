import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from app.services.parsing.base import DocumentParser, ParsedChunk
from app.utils.text_utils import clean_text


class EpubParser(DocumentParser):
    async def parse(self, file_path: str) -> list[ParsedChunk]:
        book = epub.read_epub(file_path)
        chunks = []
        chapter_num = 0
        for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
            soup = BeautifulSoup(item.get_content(), "html.parser")
            chapter_title = None
            heading = soup.find(["h1", "h2", "h3"])
            if heading:
                chapter_title = heading.get_text(strip=True)
            chapter_num += 1
            text = clean_text(soup.get_text(separator="\n"))
            if text.strip():
                chunks.append(ParsedChunk(
                    text=text,
                    chapter=chapter_title or f"Chapter {chapter_num}",
                    heading_context=chapter_title,
                ))
        return chunks
