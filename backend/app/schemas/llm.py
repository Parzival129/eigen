from pydantic import BaseModel


class ChunkContext(BaseModel):
    text: str
    page_number: int | None = None
    file_name: str


class SummarizeRequest(BaseModel):
    query: str
    chunks: list[ChunkContext]


class SummarizeResponse(BaseModel):
    summary: str


class QuizRequest(BaseModel):
    query: str
    chunks: list[ChunkContext]


class QuizQuestion(BaseModel):
    question: str
    options: list[str]  # 4 options
    correct_index: int  # 0-3
    explanation: str


class QuizResponse(BaseModel):
    questions: list[QuizQuestion]
