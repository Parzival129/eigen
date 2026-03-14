import pytest
import pytest_asyncio
from unittest.mock import AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def mock_openai_embedder(monkeypatch):
    mock = AsyncMock()
    mock.embed_text.return_value = [0.1] * 1536
    mock.embed_batch.return_value = [[0.1] * 1536]
    monkeypatch.setattr(
        "app.services.embeddings.openai_provider.OpenAIEmbeddingProvider",
        lambda: mock,
    )
    return mock


@pytest.fixture
def mock_moorcheh_client(monkeypatch):
    mock = AsyncMock()
    mock.search.query.return_value = {"results": []}
    mock.vectors.upload.return_value = None
    mock.vectors.delete.return_value = None
    mock.namespaces.create.return_value = None
    monkeypatch.setattr(
        "app.services.moorcheh.client.get_moorcheh_client",
        lambda: mock,
    )
    return mock


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
