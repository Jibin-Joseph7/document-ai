# ai-service/app/routers/ingest.py
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.ingestion import ingest_document, remove_document

router = APIRouter(prefix="/ingest", tags=["ingestion"])


class IngestRequest(BaseModel):
    document_id: int
    filepath: str
    mime_type: str
    # Arbitrary metadata to attach to every chunk (owner_id, category,
    # folder_id, ...) so later search/RAG endpoints can filter on it
    # without a round-trip back to the Node server for every chunk.
    metadata: Optional[dict] = None


class IngestResponse(BaseModel):
    document_id: int
    status: str
    chunk_count: int = 0
    error: Optional[str] = None


@router.post("", response_model=IngestResponse)
def ingest(req: IngestRequest):
    result = ingest_document(
        document_id=req.document_id,
        filepath=req.filepath,
        mime_type=req.mime_type,
        extra_metadata=req.metadata,
    )
    return IngestResponse(
        document_id=result.document_id,
        status=result.status,
        chunk_count=result.chunk_count,
        error=result.error,
    )


@router.delete("/{document_id}")
def remove(document_id: int):
    remove_document(document_id)
    return {"document_id": document_id, "removed": True}