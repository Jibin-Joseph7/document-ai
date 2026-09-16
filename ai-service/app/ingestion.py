# ai-service/app/ingestion.py
"""
The full pipeline a newly uploaded document goes through before it's
searchable: extract text -> split into chunks -> embed each chunk ->
store in the vector database. This is what commit 19's Node<->AI-service
integration calls right after a file is uploaded.
"""
import logging
from dataclasses import dataclass
from typing import Optional

from app.extraction import extract_text, ExtractionError
from app.chunking import chunk_text
from app.embeddings import embed_texts, EmbeddingError
from app.vector_store import upsert_document_chunks, delete_document_chunks

logger = logging.getLogger(__name__)


@dataclass
class IngestionResult:
    document_id: int
    status: str  # 'ready' | 'failed'
    chunk_count: int = 0
    error: Optional[str] = None


def ingest_document(
    document_id: int,
    filepath: str,
    mime_type: str,
    extra_metadata: Optional[dict] = None,
) -> IngestionResult:
    """Run the full pipeline for one document. Never raises - failures
    (unsupported format, corrupt file, unreachable embedding provider,
    etc.) are caught and returned as a 'failed' IngestionResult so the
    caller (an HTTP endpoint, or eventually a background worker) always
    gets a clean result to report back to the user rather than a 500."""
    try:
        text = extract_text(filepath, mime_type)
    except ExtractionError as e:
        logger.warning("Extraction failed for document %s: %s", document_id, e)
        return IngestionResult(document_id=document_id, status="failed", error=str(e))

    chunks = chunk_text(text)
    if not chunks:
        # Shouldn't normally happen - extract_text already rejects empty
        # results - but guard anyway rather than silently storing nothing.
        return IngestionResult(
            document_id=document_id, status="failed", error="No content to index after chunking"
        )

    try:
        embeddings = embed_texts([c.text for c in chunks])
    except EmbeddingError as e:
        logger.warning("Embedding failed for document %s: %s", document_id, e)
        return IngestionResult(document_id=document_id, status="failed", error=str(e))

    try:
        chunk_count = upsert_document_chunks(document_id, chunks, embeddings, extra_metadata)
    except Exception as e:  # vector store failures shouldn't crash the caller either
        logger.exception("Vector store write failed for document %s", document_id)
        return IngestionResult(document_id=document_id, status="failed", error=str(e))

    return IngestionResult(document_id=document_id, status="ready", chunk_count=chunk_count)


def remove_document(document_id: int) -> None:
    """Called when a document is deleted on the Node side, so its chunks
    don't linger in the vector store and show up in search results for a
    document that no longer exists."""
    delete_document_chunks(document_id)