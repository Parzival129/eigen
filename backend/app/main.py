import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import structlog

import os
from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger
from app.api.dependencies import limiter
from app.api.routes import health, ingest, search, files
from app.api.routes import llm as llm_routes

settings = get_settings()
setup_logging(settings.log_level)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)

    # Auto-create tables (safe for both SQLite and PostgreSQL)
    from app.db.base import Base
    from app.db.models import File, Chunk, IngestionJob  # noqa: F401
    from app.db.session import engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from app.services.chroma.client import get_chroma_collection
    get_chroma_collection()
    logger.info("Starting up GenAI backend")
    yield
    logger.info("Shutting down GenAI backend")


app = FastAPI(
    title="GenAI Educational Search API",
    version="0.1.0",
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request ID middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# Routers
app.include_router(health.router)
app.include_router(ingest.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1")
app.include_router(llm_routes.router, prefix="/api/v1")
