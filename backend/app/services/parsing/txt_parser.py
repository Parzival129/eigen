import aiofiles
from app.services.parsing.base import DocumentParser, ParsedChunk
from app.utils.text_utils import clean_text


class TxtParser(DocumentParser):
    async def parse(self, file_path: str) -> list[ParsedChunk]:
        async with aiofiles.open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = await f.read()
        content = clean_text(content)
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        return [ParsedChunk(text=para) for para in paragraphs]
