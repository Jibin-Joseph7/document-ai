from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ingestion import ingest_document, remove_document


router = APIRouter(prefix="/ingest", tags=["ingestion"])


class IngestRequest(BaseModel):
    document_id: int
    filepath: str
    mime_type: str
    metadata: dict = Field(default_factory=dict)


@router.post("")
def ingest(request: IngestRequest):
    result = ingest_document(
        document_id=request.document_id,
        filepath=request.filepath,
        mime_type=request.mime_type,
        extra_metadata=request.metadata,
    )

    return {
        "document_id": result.document_id,
        "status": result.status,
        "chunk_count": result.chunk_count,
        "error": result.error,
    }


@router.delete("/{document_id}")
def delete_ingestion(document_id: int):
    remove_document(document_id)

    return {
        "document_id": document_id,
        "status": "deleted",
    }
