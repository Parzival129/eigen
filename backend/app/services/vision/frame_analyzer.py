import asyncio
import base64
import io
import json
import re
import string
from dataclasses import dataclass

from openai import AsyncOpenAI
from PIL import Image, ImageChops, ImageStat

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

BATCH_SIZE = 8
FRAME_CAP = 60
DEDUP_THRESHOLD = 5.0


@dataclass
class FrameDescription:
    timestamp: float
    description: str


class FrameAnalyzer:
    def __init__(self):
        settings = get_settings()
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.vision_model
        self._semaphore = asyncio.Semaphore(5)

    async def analyze(self, file_path: str) -> list[FrameDescription]:
        from moviepy import VideoFileClip

        clip = VideoFileClip(file_path)
        duration = clip.duration
        interval = max(10, duration / FRAME_CAP)

        timestamps: list[float] = []
        t = 0.0
        while t < duration:
            timestamps.append(t)
            t += interval

        logger.info(
            "Extracting frames",
            file_path=file_path,
            duration_seconds=round(duration, 2),
            interval_seconds=round(interval, 2),
            candidate_frames=len(timestamps),
        )

        # Extract frames and deduplicate
        survivors: list[tuple[float, str]] = []
        prev_img: Image.Image | None = None
        duplicates = 0

        for ts in timestamps:
            frame = clip.get_frame(ts)
            img = Image.fromarray(frame)

            if self._is_duplicate(img, prev_img):
                duplicates += 1
                continue

            prev_img = img
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=40)
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            survivors.append((ts, b64))

        clip.close()

        logger.info(
            "Frame deduplication complete",
            candidate_frames=len(timestamps),
            unique_frames=len(survivors),
            duplicates_skipped=duplicates,
        )

        # Batch frames and send to API
        batches: list[list[tuple[float, str]]] = []
        for i in range(0, len(survivors), BATCH_SIZE):
            batches.append(survivors[i : i + BATCH_SIZE])

        logger.info(
            "Sending frames to vision model",
            model=self._model,
            total_frames=len(survivors),
            total_batches=len(batches),
            batch_size=BATCH_SIZE,
        )

        async def _analyze_batch(
            batch: list[tuple[float, str]],
            batch_num: int,
        ) -> list[FrameDescription]:
            labels = list(string.ascii_uppercase[: len(batch)])
            content: list[dict] = []

            label_list = ", ".join(labels)
            content.append(
                {
                    "type": "text",
                    "text": (
                        f"These are {len(batch)} video frames labeled {label_list}. "
                        "For each frame, describe what is visually shown in 2-3 sentences. "
                        "Focus on text on screen, slides, diagrams, people, actions, and visual content. "
                        'Respond in JSON: {"frames": [{"frame": "<label>", "description": "..."}]}'
                    ),
                }
            )

            for label, (_, b64) in zip(labels, batch):
                content.append({"type": "text", "text": f"Frame {label}:"})
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64}",
                            "detail": "low",
                        },
                    }
                )

            logger.debug(
                "Vision API request",
                batch=f"{batch_num}/{len(batches)}",
                frames_in_batch=len(batch),
                timestamps=[round(ts, 1) for ts, _ in batch],
            )
            async with self._semaphore:
                response = await self._client.chat.completions.create(
                    model=self._model,
                    messages=[{"role": "user", "content": content}],
                    max_tokens=150 * len(batch),
                    response_format={"type": "json_object"},
                )

            raw = response.choices[0].message.content or ""
            results = self._parse_batch_response(raw, batch, labels)
            logger.debug(
                "Vision API response parsed",
                batch=f"{batch_num}/{len(batches)}",
                descriptions_returned=len(results),
            )
            return results

        tasks = [_analyze_batch(b, i + 1) for i, b in enumerate(batches)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        descriptions: list[FrameDescription] = []
        failed_batches = 0
        for r in results:
            if isinstance(r, list):
                descriptions.extend(r)
            elif isinstance(r, Exception):
                failed_batches += 1
                logger.warning(
                    "Vision batch analysis failed",
                    error=str(r),
                    error_type=type(r).__name__,
                )

        descriptions.sort(key=lambda d: d.timestamp)
        logger.info(
            "Frame analysis finished",
            total_descriptions=len(descriptions),
            failed_batches=failed_batches,
        )
        return descriptions

    @staticmethod
    def _is_duplicate(
        current: Image.Image,
        previous: Image.Image | None,
        threshold: float = DEDUP_THRESHOLD,
    ) -> bool:
        if previous is None:
            return False
        curr_thumb = current.resize((64, 64)).convert("L")
        prev_thumb = previous.resize((64, 64)).convert("L")
        diff = ImageChops.difference(curr_thumb, prev_thumb)
        stat = ImageStat.Stat(diff)
        return stat.mean[0] < threshold

    @staticmethod
    def _parse_batch_response(
        raw: str,
        batch: list[tuple[float, str]],
        labels: list[str],
    ) -> list[FrameDescription]:
        label_to_ts = {label: ts for label, (ts, _) in zip(labels, batch)}

        # Try JSON parsing first
        try:
            data = json.loads(raw)
            frames = data.get("frames", [])
            results = []
            for entry in frames:
                label = entry.get("frame", "")
                desc = entry.get("description", "")
                if label in label_to_ts and desc:
                    results.append(
                        FrameDescription(timestamp=label_to_ts[label], description=desc)
                    )
            if results:
                return results
        except (json.JSONDecodeError, AttributeError):
            pass

        # Fallback: regex split on "Frame X" markers
        logger.warning("Vision JSON parse failed, falling back to regex splitting")
        results = []
        for match in re.finditer(
            r"Frame\s+([A-H])[\s:]+(.+?)(?=Frame\s+[A-H]|\Z)",
            raw,
            re.DOTALL,
        ):
            label = match.group(1)
            desc = match.group(2).strip()
            if label in label_to_ts and desc:
                results.append(
                    FrameDescription(timestamp=label_to_ts[label], description=desc)
                )
        return results
