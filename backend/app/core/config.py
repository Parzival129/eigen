from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./genai.db"
    database_sync_url: str = "sqlite:///./genai.db"
    openai_api_key: str
    chroma_persist_path: str = "./chroma_db"
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"
    max_file_size_mb: int = 2048
    embedding_max_input_tokens: int = 8000
    upload_dir: str = "./uploads"
    log_level: str = "INFO"
    vision_model: str = "gpt-4o-mini"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
