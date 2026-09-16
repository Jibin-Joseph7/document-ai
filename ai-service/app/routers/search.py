# ai-service/app/routers/search.py
"""
Semantic search over ingested document chunks.

Permission enforcement lives entirely on the Node side (Document.listForUser
already knows the visibility rules - ownership, department, shares). This
service has no concept of users or roles at all, so the Node server is
expected to always pass the caller's `document_ids` (their full visible-
document set) and this endpoint filters to exactly that set. If
`document_ids` is an empty list, the caller has no visible documents at
all - that returns zero results, not "no filter applied". Only omitting
`document_ids` entirely skips filtering, which callers should do
deliberately (e.g. admin tooling), never as a default.
"""
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.embeddings import embed_query
from app.vector_store import query_similar

router = APIRouter(prefix="/search", tags=["search"])


class SearchRequest(BaseModel):
    query: str
    document_ids: Optional[List[int]] = None
    n_results: int = Field(default=5, ge=1, le=50)


class SearchHit(BaseModel):
    document_id: int
    chunk_index: int
    text: str
    score: float  # higher is more relevant; roughly in [-1, 1]
    char_start: int
    char_end: int


class SearchResponse(BaseModel):
    query: str
    results: List[SearchHit]


@router.post("", response_model=SearchResponse)
def search(req: SearchRequest):
    # Explicit empty scope -> explicit empty results. Don't fall through to
    # an unfiltered query just because `document_ids == []` is falsy-ish;
    # that would leak every document in the system to a user who can see
    # none of them.
    if req.document_ids is not None and len(req.document_ids) == 0:
        return SearchResponse(query=req.query, results=[])

    where = {"document_id": {"$in": req.document_ids}} if req.document_ids is not None else None

    query_embedding = embed_query(req.query)
    hits = query_similar(query_embedding, n_results=req.n_results, where=where)

    results = [
        SearchHit(
            document_id=h["document_id"],
            chunk_index=h["chunk_index"],
            text=h["text"],
            # Chroma's cosine *distance* is 1 - cosine_similarity for the
            # collection's configured space; convert back to a similarity
            # score so a higher number always means "more relevant" for
            # API consumers, matching the convention in app/embeddings.py.
            score=1.0 - h["distance"],
            char_start=h["metadata"]["char_start"],
            char_end=h["metadata"]["char_end"],
        )
        for h in hits
    ]
    return SearchResponse(query=req.query, results=results)