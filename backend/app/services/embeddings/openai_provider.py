from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.services.embeddings.base import EmbeddingProvider
from app.core.config import get_settings
from app.utils.text_utils import count_tokens


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
        response = await self._client.embeddings.create(
            model=self.MODEL, input=text
        )
        return response.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        async def embed_with_isolation(batch: list[str]) -> list[list[float]]:
            self._validate_input_tokens(batch)
            try:
                response = await self._client.embeddings.create(model=self.MODEL, input=batch)
                return [item.embedding for item in response.data]
            except Exception:
                if len(batch) == 1:
                    raise
                mid = len(batch) // 2
                left = await embed_with_isolation(batch[:mid])
                right = await embed_with_isolation(batch[mid:])
                return left + right

        results = []
        for i in range(0, len(texts), self.BATCH_SIZE):
            batch = texts[i : i + self.BATCH_SIZE]
            results.extend(await embed_with_isolation(batch))
        return results
