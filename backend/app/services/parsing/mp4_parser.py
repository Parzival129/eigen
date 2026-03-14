import os
import tempfile
from app.services.parsing.base import DocumentParser, ParsedChunk
from app.services.transcription.whisper_provider import WhisperProvider
from app.services.vision.frame_analyzer import FrameAnalyzer
from app.utils.text_utils import clean_text


class Mp4Parser(DocumentParser):
    def __init__(self):
        self._transcriber = WhisperProvider()
        self._frame_analyzer = FrameAnalyzer()

    async def parse(self, file_path: str) -> list[ParsedChunk]:
        # Extract audio from MP4
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            audio_path = tmp.name

        try:
            from moviepy import VideoFileClip
            clip = VideoFileClip(file_path)
            clip.audio.write_audiofile(audio_path)
            clip.close()

            segments = await self._transcriber.transcribe(audio_path)

            # Analyze visual frames
            frame_descriptions = await self._frame_analyzer.analyze(file_path)

            chunks = []
            for i, seg in enumerate(segments):
                # Find frame descriptions that fall within this segment's time range
                visual_texts = []
                for fd in frame_descriptions:
                    if seg.start <= fd.timestamp < seg.end:
                        visual_texts.append(f"[Visual: {fd.description}]")

                text = clean_text(seg.text)
                if visual_texts or text:
                    merged = "\n".join(visual_texts)
                    if merged and text:
                        merged = merged + "\n" + text
                    elif text:
                        merged = text
                    chunks.append(ParsedChunk(
                        text=merged,
                        start_time=seg.start,
                        end_time=seg.end,
                    ))

            # Attach any remaining frame descriptions to nearest segment
            if segments and frame_descriptions:
                used_timestamps = set()
                for seg in segments:
                    for fd in frame_descriptions:
                        if seg.start <= fd.timestamp < seg.end:
                            used_timestamps.add(fd.timestamp)

                for fd in frame_descriptions:
                    if fd.timestamp not in used_timestamps and chunks:
                        # Find nearest chunk
                        nearest_idx = 0
                        nearest_dist = float("inf")
                        for j, chunk in enumerate(chunks):
                            mid = ((chunk.start_time or 0) + (chunk.end_time or 0)) / 2
                            dist = abs(fd.timestamp - mid)
                            if dist < nearest_dist:
                                nearest_dist = dist
                                nearest_idx = j
                        visual_line = f"[Visual: {fd.description}]"
                        chunks[nearest_idx] = ParsedChunk(
                            text=visual_line + "\n" + chunks[nearest_idx].text,
                            start_time=chunks[nearest_idx].start_time,
                            end_time=chunks[nearest_idx].end_time,
                        )

            return chunks
        finally:
            if os.path.exists(audio_path):
                os.unlink(audio_path)
