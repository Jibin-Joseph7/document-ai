from fastapi import APIRouter
from pydantic import BaseModel, Field


router = APIRouter(prefix="/tag", tags=["tagging"])


class TagRequest(BaseModel):
    text: str
    tags: list[str] = Field(default_factory=list)


@router.post("")
def create_tags(request: TagRequest):
    return {
        "tags": request.tags,
        "message": "Automatic tag generation is not configured yet."
    }
