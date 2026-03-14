import json
import structlog
from google import genai
from google.genai import types

from app.core.config import get_settings
from app.schemas.llm import ChunkContext, QuizResponse

logger = structlog.get_logger(__name__)

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        settings = get_settings()
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def _format_chunks(chunks: list[ChunkContext]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk.file_name
        if chunk.page_number is not None:
            source += f", page {chunk.page_number}"
        parts.append(f"[{i}] ({source})\n{chunk.text}")
    return "\n\n".join(parts)


async def generate_summary(query: str, chunks: list[ChunkContext]) -> str:
    formatted = _format_chunks(chunks)
    prompt = (
        f'You are a helpful educational assistant. A student searched for: "{query}"\n\n'
        f"Here are the most relevant passages from their documents:\n\n{formatted}\n\n"
        f'Write a clear, concise summary (3-5 sentences) of what these passages say about "{query}". '
        f"Draw on the provided context and your general knowledge. Be educational and informative."
    )

    client = _get_client()
    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    return response.text or ""


async def generate_quiz(query: str, chunks: list[ChunkContext]) -> QuizResponse:
    formatted = _format_chunks(chunks)
    prompt = (
        f'You are an educational assessment creator. A student searched for: "{query}"\n\n'
        f"Here are relevant passages from their documents:\n\n{formatted}\n\n"
        f'Generate 5 multiple-choice questions to test understanding of "{query}" based on the content above.\n'
        f"Each question must have exactly 4 answer options.\n\n"
        f"Respond ONLY with valid JSON in this exact format:\n"
        f'{{\n'
        f'  "questions": [\n'
        f'    {{\n'
        f'      "question": "...",\n'
        f'      "options": ["A", "B", "C", "D"],\n'
        f'      "correct_index": 0,\n'
        f'      "explanation": "Brief explanation of why this is correct"\n'
        f'    }}\n'
        f'  ]\n'
        f"}}"
    )

    client = _get_client()
    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    raw = response.text or "{}"
    data = json.loads(raw)
    return QuizResponse(**data)
