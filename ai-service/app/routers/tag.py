from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.tagging import suggest_tags, NoContentError

router = APIRouter(prefix="/tag", tags=["tagging"])


class TagRequest(BaseModel):
    document_id: int
    max_tags: int = Field(default=5, ge=1, le=15)


class TagResponse(BaseModel):
    document_id: int
    method: str
    category: Optional[str]
    tags: List[str]


@router.post("", response_model=TagResponse)
def tag(req: TagRequest):
    try:
        result = suggest_tags(req.document_id, max_tags=req.max_tags)
    except NoContentError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return TagResponse(
        document_id=result.document_id,
        method=result.method,
        category=result.category,
        tags=result.tags,
    )
