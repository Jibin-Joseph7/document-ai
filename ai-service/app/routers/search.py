from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.embeddings import embed_texts
from app.vector_store import query_similar


router = APIRouter(prefix="/search", tags=["search"])


class SearchRequest(BaseModel):
    query: str
    n_results: int = Field(default=5, ge=1, le=50)
    where: dict | None = None


@router.post("")
def search(request: SearchRequest):
    query_embedding = embed_texts([request.query])[0]

    results = query_similar(
        query_embedding,
        n_results=request.n_results,
        where=request.where,
    )

    return {
        "query": request.query,
        "results": results,
    }
