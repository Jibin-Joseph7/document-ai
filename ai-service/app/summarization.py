# ai-service/app/summarization.py
"""
Document summarization, built on the same chunk store as search/RAG rather
than re-reading the file from disk - the chunks (with their char_start/
char_end offsets into the original text) are already sitting in the
vector store from ingestion, so summarization reconstructs the source
text from them instead of re-running extraction.
"""
import re
from dataclasses import dataclass
from typing import List

import numpy as np
import requests

from app.config import get_settings
from app.embeddings import embed_texts
from app.vector_store import get_chunks_for_document

_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")

# A generative summary is one LLM call over the whole document, so it's
# worth bounding how much text gets sent regardless of document size -
# both for cost and because most chat models have a context limit anyway.
MAX_CHARS_FOR_GENERATIVE_SUMMARY = 12000


class NoContentError(Exception):
    """Raised when a document has no ingested chunks to summarize (never
    ingested, or ingestion failed)."""


@dataclass
class SummaryResult:
    document_id: int
    method: str  # 'extractive' | 'generated'
    summary: str
    key_points: List[str]


def reconstruct_document_text(document_id: int) -> str:
    """Rebuild the original extracted text from its stored chunks.

    Chunks overlap by design (chunking.py), but each chunk.text is a
    verbatim slice of the source at [char_start:char_end], so chunks
    sorted by position can be stitched back together exactly: take the
    first chunk in full, then for every next chunk only append the part
    of it that starts after where the previous chunk already left off.

    Limitation, stated plainly: this is only an *exact* reconstruction
    when chunk_overlap_words > 0 (the project default is 40). With zero
    overlap, chunks are word-adjacent but not touching at the character
    level -- the whitespace between the last word of one chunk and the
    first word of the next was never captured by either chunk's span, so
    it genuinely can't be recovered from the stored chunks alone. That
    gap is filled with a single space as a reasonable approximation.
    Word content is always fully preserved either way; only the exact
    original whitespace at that boundary (e.g. a double-space or a
    newline) is not guaranteed to survive when overlap is 0.
    """
    chunks = get_chunks_for_document(document_id)
    if not chunks:
        raise NoContentError(f"No ingested content found for document {document_id}")

    chunks.sort(key=lambda c: c["char_start"])
    parts = [chunks[0]["text"]]
    covered_until = chunks[0]["char_end"]

    for chunk in chunks[1:]:
        if chunk["char_end"] <= covered_until:
            continue  # fully contained in what we already have
        if chunk["char_start"] > covered_until:
            # Genuine gap - see the limitation note above.
            parts.append(" ")
            parts.append(chunk["text"])
        elif chunk["char_start"] == covered_until:
            # Exactly adjacent - chunk["text"] already starts precisely
            # where coverage left off, so no separator needed.
            parts.append(chunk["text"])
        else:
            # Partial overlap - only take the new tail. chunk["text"][offset:]
            # starts at original-text position chunk["char_start"] + offset
            # == covered_until, which is precisely the whitespace character
            # right after the previously-covered text - already exactly
            # correct, no separator needs to be inserted here either.
            offset = covered_until - chunk["char_start"]
            parts.append(chunk["text"][offset:])
        covered_until = max(covered_until, chunk["char_end"])

    # "".join, not " ".join: every part above is either an exact slice of
    # the original string (already including whatever whitespace belongs
    # at its boundary) or an explicit single-space gap-filler added above.
    # A blanket separator here would double up whitespace at every
    # overlapping boundary.
    return "".join(parts)


def _split_sentences(text: str) -> List[str]:
    return [s.strip() for s in _SENTENCE_RE.split(text) if s.strip()]


def _extractive_summary(text: str, max_sentences: int) -> SummaryResult:
    sentences = _split_sentences(text)
    if not sentences:
        return SummaryResult(document_id=0, method="extractive", summary="", key_points=[])
    if len(sentences) <= max_sentences:
        return SummaryResult(
            document_id=0, method="extractive", summary=" ".join(sentences), key_points=sentences
        )

    # Centroid-based extractive summarization: embed every sentence, take
    # the mean vector as a stand-in for "what this document is mostly
    # about", then rank sentences by similarity to that centroid. This is
    # a well-known lightweight alternative to full TextRank that needs no
    # external model - just the same embeddings already used everywhere
    # else in this service.
    embeddings = np.array(embed_texts(sentences))
    centroid = embeddings.mean(axis=0)
    centroid_norm = np.linalg.norm(centroid)
    if centroid_norm > 0:
        centroid = centroid / centroid_norm

    scores = embeddings @ centroid
    ranked_indices = np.argsort(-scores)[:max_sentences]

    key_points = [sentences[i] for i in ranked_indices]
    # For the paragraph-style summary, keep the top sentences in their
    # *original* order - reads far more coherently than sorted-by-score.
    summary_indices = sorted(ranked_indices.tolist())
    summary = " ".join(sentences[i] for i in summary_indices)

    return SummaryResult(document_id=0, method="extractive", summary=summary, key_points=key_points)


def _generated_summary(text: str) -> SummaryResult:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError(
            "LLM_PROVIDER=openai but OPENAI_API_KEY is not set. "
            "Set it in .env or switch LLM_PROVIDER=none for extractive summaries."
        )

    truncated = text[:MAX_CHARS_FOR_GENERATIVE_SUMMARY]
    prompt = (
        "Summarize the following document. Cover: the main purpose, the most "
        "important points, any key dates or deadlines, any requirements, and "
        "a brief conclusion. Keep it concise.\n\nDocument:\n" + truncated
    )

    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.llm_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    summary_text = data["choices"][0]["message"]["content"]
    return SummaryResult(document_id=0, method="generated", summary=summary_text, key_points=[])


def summarize_document(document_id: int, max_sentences: int = 5) -> SummaryResult:
    text = reconstruct_document_text(document_id)

    settings = get_settings()
    if settings.llm_provider == "openai":
        result = _generated_summary(text)
    else:
        result = _extractive_summary(text, max_sentences)

    result.document_id = document_id
    return result