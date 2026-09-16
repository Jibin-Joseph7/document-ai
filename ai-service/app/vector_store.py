"""
Thin wrapper around a persistent ChromaDB collection. Embeddings are always
computed ourselves (app/embeddings.py) and passed in explicitly - Chroma's
own default embedding function is never used, so this module has no
opinion about which embedding provider is active; it just stores/searches
whatever vectors it's given.

Chunk IDs are f"{document_id}:{chunk_index}", which makes "delete every
chunk belonging to this document" a metadata-filtered delete rather than
needing to track IDs separately anywhere.
"""
from functools import lru_cache
from typing import List, Optional

import chromadb

from app.config import get_settings
from app.chunking import Chunk

COLLECTION_NAME = "document_chunks"


@lru_cache
def get_client():
    settings = get_settings()
    settings.chroma_persist_path.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(
        path=str(settings.chroma_persist_path),
        settings=chromadb.Settings(anonymized_telemetry=False),
    )


@lru_cache
def get_collection():
    client = get_client()
    # cosine distance is the natural match for the L2-normalized vectors
    # produced by app/embeddings.py.
    return client.get_or_create_collection(
        name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
    )


def _chunk_id(document_id: int, chunk_index: int) -> str:
    return f"{document_id}:{chunk_index}"


def upsert_document_chunks(
    document_id: int,
    chunks: List[Chunk],
    embeddings: List[List[float]],
    extra_metadata: Optional[dict] = None,
) -> int:
    """Store (or replace) every chunk for a document. Returns the number of
    chunks written. Replaces any existing chunks for this document first,
    so re-ingesting a document (e.g. after an edit) doesn't leave stale
    chunks behind if the new version has fewer chunks than the old one."""
    if len(chunks) != len(embeddings):
        raise ValueError("chunks and embeddings must be the same length")

    delete_document_chunks(document_id)
    if not chunks:
        return 0

    collection = get_collection()
    # Chroma's metadata validator rejects None outright (only str/int/float/
    # bool are allowed), and it's entirely normal for a caller to pass
    # metadata with some fields unset (e.g. a document with no category
    # yet) — so strip None values here rather than pushing that
    # requirement onto every caller.
    base_metadata = {k: v for k, v in (extra_metadata or {}).items() if v is not None}
    ids = [_chunk_id(document_id, c.index) for c in chunks]
    documents = [c.text for c in chunks]
    metadatas = [
        {
            **base_metadata,
            "document_id": document_id,
            "chunk_index": c.index,
            "char_start": c.char_start,
            "char_end": c.char_end,
        }
        for c in chunks
    ]

    collection.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
    return len(chunks)


def delete_document_chunks(document_id: int) -> None:
    collection = get_collection()
    collection.delete(where={"document_id": document_id})


def count_chunks_for_document(document_id: int) -> int:
    collection = get_collection()
    result = collection.get(where={"document_id": document_id})
    return len(result["ids"])


def query_similar(
    query_embedding: List[float],
    n_results: int = 5,
    where: Optional[dict] = None,
) -> List[dict]:
    """Return up to n_results chunks most similar to query_embedding,
    each as {chunk_id, document_id, chunk_index, text, distance, metadata}.
    `where` is a Chroma metadata filter, e.g. {"document_id": {"$in": [1,2,3]}}
    - used by the search endpoint (commit 15) to scope results to
    documents the requesting user is actually allowed to see.
    """
    collection = get_collection()
    count = collection.count()
    if count == 0:
        return []

    result = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, count),
        where=where,
    )

    hits = []
    ids = result["ids"][0]
    documents = result["documents"][0]
    metadatas = result["metadatas"][0]
    distances = result["distances"][0]
    for i in range(len(ids)):
        hits.append(
            {
                "chunk_id": ids[i],
                "document_id": metadatas[i]["document_id"],
                "chunk_index": metadatas[i]["chunk_index"],
                "text": documents[i],
                "distance": distances[i],
                "metadata": metadatas[i],
            }
        )
    return hits


def get_chunks_for_document(document_id: int) -> List[dict]:
    """All chunks for one document, sorted by chunk_index. Used by
    summarization (commit 17) to reconstruct the original text from
    overlapping chunks via their char_start/char_end offsets."""
    collection = get_collection()
    result = collection.get(where={"document_id": document_id})
    chunks = [
        {
            "chunk_index": meta["chunk_index"],
            "text": text,
            "char_start": meta["char_start"],
            "char_end": meta["char_end"],
        }
        for text, meta in zip(result["documents"], result["metadatas"])
    ]
    chunks.sort(key=lambda c: c["chunk_index"])
    return chunks


def reset_collection() -> None:
    """Danger: wipes every chunk from every document. Only used by tests
    and the (not-yet-built) admin reindex tooling."""
    client = get_client()
    client.delete_collection(COLLECTION_NAME)
    get_collection.cache_clear()