import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_search_returns_empty_on_no_results():
    from app.schemas.search import SearchRequest, SearchResponse
    from app.services.search.service import SearchService

    mock_db = AsyncMock()
    service = SearchService(mock_db)

    with patch.object(service.embedder, "embed_text", return_value=[0.1] * 1536), \
         patch("app.services.search.service.search_similar", return_value=[]):
        result = await service.search(SearchRequest(query="test query"))

    assert result.total == 0
    assert result.results == []
    assert result.query == "test query"
