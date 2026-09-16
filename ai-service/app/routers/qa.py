# ai-service/app/routers/qa.py
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.rag import answer_question

router = APIRouter(prefix="/qa", tags=["qa"])


class QARequest(BaseModel):
    question: str
    document_ids: Optional[List[int]] = None
    n_results: int = Field(default=5, ge=1, le=20)


class QASource(BaseModel):
    document_id: int
    chunk_index: int
    text: str
    score: float


class QAResponse(BaseModel):
    question: str
    answer: str
    answer_type: str
    sources: List[QASource]


@router.post("", response_model=QAResponse)
def qa(req: QARequest):
    try:
        result = answer_question(
            question=req.question, document_ids=req.document_ids, n_results=req.n_results
        )
    except RuntimeError as e:
        # e.g. LLM_PROVIDER=openai with no API key configured - this is a
        # server misconfiguration, not something retrying the request fixes.
        raise HTTPException(status_code=503, detail=str(e))

    return QAResponse(
        question=req.question,
        answer=result.answer,
        answer_type=result.answer_type,
        sources=[
            QASource(
                document_id=s.document_id,
                chunk_index=s.chunk_index,
                text=s.text,
                score=s.score,
            )
            for s in result.sources
        ],
    )