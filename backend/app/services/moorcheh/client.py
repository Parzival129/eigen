from moorcheh_sdk import AsyncMoorchehClient as _AsyncMoorchehClient
from app.core.config import get_settings

_client_instance: _AsyncMoorchehClient | None = None


def get_moorcheh_client() -> _AsyncMoorchehClient:
    global _client_instance
    if _client_instance is None:
        settings = get_settings()
        _client_instance = _AsyncMoorchehClient(api_key=settings.moorcheh_api_key)
    return _client_instance


async def ensure_namespace(client: _AsyncMoorchehClient, namespace: str) -> None:
    try:
        await client.namespaces.create(namespace, type="vector", vector_dimension=1536)
    except Exception as e:
        # ConflictError means namespace already exists - that's fine
        if "conflict" in str(e).lower() or "already exists" in str(e).lower() or "409" in str(e):
            return
        raise
