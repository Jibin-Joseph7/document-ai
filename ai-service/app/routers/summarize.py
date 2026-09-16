from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.embeddings import embed_texts
from app.vector_store import query_similar


router = APIRouter(prefix="/summarize", tags=["summarization"])


class SummarizeRequest(BaseModel):
    document_id: int
    query: str = "document content"
    n_results: int = Field(default=20, ge=1, le=100)


@router.post("")
def summarize_document(request: SummarizeRequest):
    query_embedding = embed_texts([request.query])[0]

    results = query_similar(
        query_embedding,
        n_results=request.n_results,
        where={"document_id": request.document_id},
    )

    return {
        "document_id": request.document_id,
        "summary": None,
        "results": results,
        "message": "LLM provider is not configured. Retrieved document chunks successfully."
    }
