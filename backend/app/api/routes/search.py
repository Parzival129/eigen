from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import limiter
from app.db.session import get_db
from app.schemas.search import SearchRequest, SearchResponse
from app.services.search.service import SearchService

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
@limiter.limit("30/minute")
async def search(
    request: Request,
    body: SearchRequest,
    db: AsyncSession = Depends(get_db),
):
    service = SearchService(db)
    return await service.search(body)
