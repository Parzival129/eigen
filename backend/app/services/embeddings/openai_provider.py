from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.services.embeddings.base import EmbeddingProvider
from app.core.config import get_settings
from app.utils.text_utils import count_tokens
from app.core.logging import get_logger

logger = get_logger(__name__)


class OpenAIEmbeddingProvider(EmbeddingProvider):
    dimension = 1536
    MODEL = "text-embedding-3-small"
    BATCH_SIZE = 100

    def __init__(self):
        settings = get_settings()
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.max_input_tokens = settings.embedding_max_input_tokens

    def _validate_input_tokens(self, texts: list[str]) -> None:
        for idx, text in enumerate(texts):
            token_count = count_tokens(text)
            if token_count > self.max_input_tokens:
                raise ValueError(
                    f"Embedding input at index {idx} exceeds max token limit "
                    f"({token_count}>{self.max_input_tokens})"
                )

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
    )
    async def embed_text(self, text: str) -> list[float]:
        self._validate_input_tokens([text])
        token_count = count_tokens(text)
        logger.debug("Embedding single text", tokens=token_count, model=self.MODEL)
        response = await self._client.embeddings.create(
            model=self.MODEL, input=text
        )
        return response.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        total_batches = (len(texts) + self.BATCH_SIZE - 1) // self.BATCH_SIZE
        logger.info(
            "Embedding batch started",
            total_texts=len(texts),
            batch_size=self.BATCH_SIZE,
            total_batches=total_batches,
            model=self.MODEL,
        )

        async def embed_with_isolation(batch: list[str]) -> list[list[float]]:
            self._validate_input_tokens(batch)
            try:
                response = await self._client.embeddings.create(model=self.MODEL, input=batch)
                return [item.embedding for item in response.data]
            except Exception as e:
                if len(batch) == 1:
                    raise
                logger.warning(
                    "Batch embedding failed, splitting in half and retrying",
                    batch_size=len(batch),
                    error=str(e),
                    error_type=type(e).__name__,
                )
                mid = len(batch) // 2
                left = await embed_with_isolation(batch[:mid])
                right = await embed_with_isolation(batch[mid:])
                return left + right

        results = []
        for batch_num, i in enumerate(range(0, len(texts), self.BATCH_SIZE), start=1):
            batch = texts[i : i + self.BATCH_SIZE]
            batch_tokens = sum(count_tokens(t) for t in batch)
            logger.info(
                "Processing embedding batch",
                batch=f"{batch_num}/{total_batches}",
                batch_texts=len(batch),
                batch_tokens=batch_tokens,
            )
            results.extend(await embed_with_isolation(batch))
            logger.debug(
                "Embedding batch complete",
                batch=f"{batch_num}/{total_batches}",
                cumulative_embeddings=len(results),
            )

        logger.info("Embedding batch finished", total_embeddings=len(results))
        return results
