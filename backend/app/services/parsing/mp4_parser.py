import os
import tempfile
from app.services.parsing.base import DocumentParser, ParsedChunk
from app.services.transcription.whisper_provider import WhisperProvider
from app.utils.text_utils import clean_text


class Mp4Parser(DocumentParser):
    def __init__(self):
        self._transcriber = WhisperProvider()

    async def parse(self, file_path: str) -> list[ParsedChunk]:
        # Extract audio from MP4
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            audio_path = tmp.name

        try:
            from moviepy.editor import VideoFileClip
            clip = VideoFileClip(file_path)
            clip.audio.write_audiofile(audio_path, verbose=False, logger=None)
            clip.close()

            segments = await self._transcriber.transcribe(audio_path)
            chunks = []
            for i, seg in enumerate(segments):
                text = clean_text(seg.text)
                if text:
                    chunks.append(ParsedChunk(
                        text=text,
                        start_time=seg.start,
                        end_time=seg.end,
                    ))
            return chunks
        finally:
            if os.path.exists(audio_path):
                os.unlink(audio_path)
