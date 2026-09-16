# ai-service/app/chunking.py
"""
Splits extracted text (commit 10) into overlapping chunks sized for
embedding + retrieval (commit 12/13). Word-count based rather than
token-based: token count depends on which embedding/LLM tokenizer is in
use, while word count is a stable, model-agnostic proxy that's easy to
tune and doesn't require pulling in a tokenizer just to plan chunk sizes.
"""
import re
from dataclasses import dataclass, asdict
from typing import List, Optional

from app.config import get_settings

# Matches runs of non-whitespace - used to find each word's exact start/end
# offset in the original string so a chunk's `text` is a verbatim slice of
# the source (preserves original spacing/newlines) rather than a
# reconstruction that could drift from what was actually extracted.
_WORD_RE = re.compile(r"\S+")


@dataclass
class Chunk:
    index: int
    text: str
    char_start: int
    char_end: int
    word_count: int

    def to_dict(self) -> dict:
        return asdict(self)


def chunk_text(
    text: str,
    chunk_size_words: Optional[int] = None,
    chunk_overlap_words: Optional[int] = None,
) -> List[Chunk]:
    """Split `text` into overlapping Chunks.

    Each chunk is `chunk_size_words` words wide (except possibly the last),
    with `chunk_overlap_words` words repeated at the start of the next
    chunk so retrieval doesn't lose context that happened to fall right on
    a chunk boundary.
    """
    settings = get_settings()
    chunk_size_words = (
        chunk_size_words if chunk_size_words is not None else settings.chunk_size_words
    )
    chunk_overlap_words = (
        chunk_overlap_words if chunk_overlap_words is not None else settings.chunk_overlap_words
    )

    if chunk_size_words <= 0:
        raise ValueError("chunk_size_words must be positive")
    if chunk_overlap_words < 0:
        raise ValueError("chunk_overlap_words cannot be negative")
    if chunk_overlap_words >= chunk_size_words:
        raise ValueError("chunk_overlap_words must be smaller than chunk_size_words")

    words = list(_WORD_RE.finditer(text))
    if not words:
        return []

    step = chunk_size_words - chunk_overlap_words
    chunks: List[Chunk] = []
    index = 0
    i = 0
    while i < len(words):
        window = words[i : i + chunk_size_words]
        if not window:
            break
        char_start = window[0].start()
        char_end = window[-1].end()
        chunks.append(
            Chunk(
                index=index,
                text=text[char_start:char_end],
                char_start=char_start,
                char_end=char_end,
                word_count=len(window),
            )
        )
        index += 1

        # Stop once this window already reached the end of the text -
        # otherwise a small overlap can produce a final "chunk" of just a
        # couple of leftover words, which adds noise without adding
        # retrievable context.
        if i + chunk_size_words >= len(words):
            break
        i += step

    return chunks
 