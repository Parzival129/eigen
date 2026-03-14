import os
import tempfile
from app.services.parsing.base import DocumentParser, ParsedChunk
from app.services.transcription.whisper_provider import WhisperProvider
from app.services.vision.frame_analyzer import FrameAnalyzer
from app.utils.text_utils import clean_text
from app.core.logging import get_logger

logger = get_logger(__name__)


class Mp4Parser(DocumentParser):
    def __init__(self):
        self._transcriber = WhisperProvider()
        self._frame_analyzer = FrameAnalyzer()

    async def parse(self, file_path: str) -> list[ParsedChunk]:
        logger.info("Parsing MP4 video", file_path=file_path)
        # Extract audio from MP4
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            audio_path = tmp.name

        try:
            from moviepy import VideoFileClip
            clip = VideoFileClip(file_path)
            duration = clip.duration
            logger.info(
                "Video loaded",
                file_path=file_path,
                duration_seconds=round(duration, 2),
                fps=clip.fps,
                resolution=f"{clip.size[0]}x{clip.size[1]}",
            )
            logger.info("Extracting audio track", audio_path=audio_path)
            clip.audio.write_audiofile(audio_path)
            clip.close()
            logger.info("Audio extraction complete", audio_path=audio_path)

            logger.info("Starting Whisper transcription", file_path=file_path)
            segments = await self._transcriber.transcribe(audio_path)
            logger.info(
                "Transcription complete",
                file_path=file_path,
                segments=len(segments),
                total_characters=sum(len(s.text) for s in segments),
            )

            # Analyze visual frames
            logger.info("Starting frame analysis", file_path=file_path)
            frame_descriptions = await self._frame_analyzer.analyze(file_path)
            logger.info(
                "Frame analysis complete",
                file_path=file_path,
                frame_descriptions=len(frame_descriptions),
            )

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

                orphaned = 0
                for fd in frame_descriptions:
                    if fd.timestamp not in used_timestamps and chunks:
                        orphaned += 1
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
                if orphaned:
                    logger.debug(
                        "Attached orphaned frame descriptions to nearest segments",
                        orphaned=orphaned,
                    )

            logger.info(
                "MP4 parsing complete",
                file_path=file_path,
                total_chunks=len(chunks),
                duration_seconds=round(duration, 2),
            )
            return chunks
        finally:
            if os.path.exists(audio_path):
                os.unlink(audio_path)
