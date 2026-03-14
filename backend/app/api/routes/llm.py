from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.dependencies import limiter
from app.schemas.llm import SummarizeRequest, SummarizeResponse, QuizRequest, QuizResponse
from app.services.llm.gemini_service import generate_summary, generate_quiz
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/llm", tags=["llm"])


@router.post("/summarize", response_model=SummarizeResponse)
@limiter.limit("10/minute")
async def summarize(request: Request, body: SummarizeRequest) -> SummarizeResponse:
    logger.info("summarize_request", query=body.query, chunk_count=len(body.chunks))
    summary = await generate_summary(body.query, body.chunks)
    return SummarizeResponse(summary=summary)


@router.post("/quiz", response_model=QuizResponse)
@limiter.limit("5/minute")
async def quiz(request: Request, body: QuizRequest) -> QuizResponse:
    logger.info("quiz_request", query=body.query, chunk_count=len(body.chunks))
    return await generate_quiz(body.query, body.chunks)
