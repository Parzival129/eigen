import io
import aiofiles
from openai import AsyncOpenAI
from app.services.transcription.base import TranscriptionProvider, TranscriptSegment
from app.core.config import get_settings


class WhisperProvider(TranscriptionProvider):
    def __init__(self):
        settings = get_settings()
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def transcribe(self, audio_path: str) -> list[TranscriptSegment]:
        async with aiofiles.open(audio_path, "rb") as f:
            content = await f.read()

        audio_bytes = io.BytesIO(content)
        audio_bytes.name = "audio.mp3"

        response = await self._client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_bytes,
            response_format="verbose_json",
        )

        segments = []
        if hasattr(response, "segments") and response.segments:
            for seg in response.segments:
                segments.append(TranscriptSegment(
                    text=seg.text,
                    start=seg.start,
                    end=seg.end,
                ))
        else:
            # fallback: whole transcript as one segment
            segments.append(TranscriptSegment(
                text=response.text,
                start=0.0,
                end=0.0,
            ))
        return segments
