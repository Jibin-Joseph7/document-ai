from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.summarization import summarize_document


router = APIRouter(prefix="/summarize", tags=["summarization"])


class SummarizeRequest(BaseModel):
    document_id: int
    max_sentences: int = Field(default=5, ge=1, le=20)


@router.post("")
def summarize(request: SummarizeRequest):
    try:
        result = summarize_document(
            request.document_id,
            max_sentences=request.max_sentences,
        )

        return {
            "document_id": result.document_id,
            "method": result.method,
            "summary": result.summary,
            "key_points": result.key_points,
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
