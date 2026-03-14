from fastapi import APIRouter, HTTPException, Request
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
    try:
        summary = await generate_summary(body.query, body.chunks)
    except ValueError as e:
        logger.error("summarize_config_error", error=str(e))
        raise HTTPException(status_code=503, detail=str(e))
    return SummarizeResponse(summary=summary)


@router.post("/quiz", response_model=QuizResponse)
@limiter.limit("5/minute")
async def quiz(request: Request, body: QuizRequest) -> QuizResponse:
    logger.info("quiz_request", query=body.query, chunk_count=len(body.chunks))
    try:
        return await generate_quiz(body.query, body.chunks)
    except ValueError as e:
        logger.error("quiz_config_error", error=str(e))
        raise HTTPException(status_code=503, detail=str(e))
