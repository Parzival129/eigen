from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.services.embeddings.base import EmbeddingProvider
from app.core.config import get_settings


class OpenAIEmbeddingProvider(EmbeddingProvider):
    dimension = 1536
    MODEL = "text-embedding-3-small"
    BATCH_SIZE = 100

    def __init__(self):
        settings = get_settings()
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
    )
    async def embed_text(self, text: str) -> list[float]:
        response = await self._client.embeddings.create(
            model=self.MODEL, input=text
        )
        return response.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        results = []
        for i in range(0, len(texts), self.BATCH_SIZE):
            batch = texts[i : i + self.BATCH_SIZE]
            response = await self._client.embeddings.create(model=self.MODEL, input=batch)
            results.extend([item.embedding for item in response.data])
        return results
