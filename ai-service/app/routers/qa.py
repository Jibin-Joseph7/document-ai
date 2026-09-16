from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.embeddings import embed_texts
from app.vector_store import query_similar


router = APIRouter(prefix="/qa", tags=["qa"])


class QARequest(BaseModel):
    question: str
    n_results: int = Field(default=5, ge=1, le=20)
    where: dict | None = None


@router.post("")
def answer_question(request: QARequest):
    query_embedding = embed_texts([request.question])[0]

    results = query_similar(
        query_embedding,
        n_results=request.n_results,
        where=request.where,
    )

    return {
        "question": request.question,
        "answer": None,
        "results": results,
        "message": "LLM provider is not configured. Retrieved relevant document chunks successfully."
    }
