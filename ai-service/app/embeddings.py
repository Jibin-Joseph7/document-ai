# ai-service/app/embeddings.py
"""
Turns text into fixed-length vectors for the vector store (commit 13).

Two providers, selected by EMBEDDING_PROVIDER:

  'local'  - a self-contained hashing-trick embedding (this file). No
             model download, no network call, fully deterministic.
             This is a deliberate choice for this environment: a "real"
             local model (sentence-transformers, fastembed, etc.) needs
             to download weights from huggingface.co at first use, and
             this project's sandbox network allowlist doesn't include
             that domain. The interface below is provider-agnostic, so
             swapping in sentence-transformers in an environment that
             *can* reach huggingface.co is a same-shaped drop-in - see
             _embed_local's docstring for exactly what to change.

  'openai' - OpenAI's embeddings API. Requires OPENAI_API_KEY. Also not
             reachable from this sandbox (api.openai.com isn't in the
             network allowlist either), so this path is implemented and
             unit-testable for its error handling, but the actual HTTP
             call itself could not be exercised live here - noted in
             the commit message rather than glossed over.

Both providers return L2-normalized vectors, so downstream cosine
similarity is just a dot product.
"""
import hashlib
import re
from typing import List

import numpy as np
import requests

from app.config import get_settings

LOCAL_EMBEDDING_DIM = 384  # matches common small-model dimensionality (e.g. MiniLM)

_TOKEN_RE = re.compile(r"[a-z0-9]+")


class EmbeddingError(Exception):
    """Raised when text can't be embedded (missing API key, provider
    request failure, unsupported provider, etc.)."""


def _tokenize(text: str) -> List[str]:
    words = _TOKEN_RE.findall(text.lower())
    # Adjacent-word bigrams add a little phrase-level signal on top of
    # pure bag-of-words (e.g. "annual leave" hashes differently than
    # "annual" and "leave" appearing separately elsewhere).
    bigrams = [f"{a}_{b}" for a, b in zip(words, words[1:])]
    return words + bigrams


def _hash_token(token: str) -> tuple:
    """Stable (index, sign) for a token. Using a hash-derived sign (rather
    than always +1) keeps the hashing trick's expected inner product
    between unrelated vectors near zero instead of biased positive -
    standard practice for hashing-trick vectorizers."""
    digest = hashlib.sha256(token.encode("utf-8")).digest()
    index = int.from_bytes(digest[:4], "big") % LOCAL_EMBEDDING_DIM
    sign = 1.0 if (digest[4] & 1) == 0 else -1.0
    return index, sign


def _embed_local_one(text: str) -> np.ndarray:
    vec = np.zeros(LOCAL_EMBEDDING_DIM, dtype=np.float64)
    tokens = _tokenize(text)
    if not tokens:
        return vec  # all-zero vector for empty input; caller decides how to handle

    counts: dict = {}
    for tok in tokens:
        counts[tok] = counts.get(tok, 0) + 1

    for tok, count in counts.items():
        index, sign = _hash_token(tok)
        # log-dampened term frequency: a word appearing 10x shouldn't get
        # 10x the weight of one appearing once, just more than 1x.
        weight = 1.0 + np.log(count)
        vec[index] += sign * weight

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec


def _embed_local(texts: List[str]) -> List[List[float]]:
    return [_embed_local_one(t).tolist() for t in texts]


def _embed_openai(texts: List[str]) -> List[List[float]]:
    settings = get_settings()
    if not settings.openai_api_key:
        raise EmbeddingError(
            "EMBEDDING_PROVIDER=openai but OPENAI_API_KEY is not set. "
            "Set it in .env or switch EMBEDDING_PROVIDER=local."
        )

    try:
        resp = requests.post(
            "https://api.openai.com/v1/embeddings",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={"model": "text-embedding-3-small", "input": texts},
            timeout=30,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        raise EmbeddingError(f"OpenAI embeddings request failed: {e}") from e

    data = resp.json()
    # Preserve input order - the API's `index` field guarantees this
    # even if a provider ever returned results out of order.
    ordered = sorted(data["data"], key=lambda d: d["index"])
    return [item["embedding"] for item in ordered]


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a batch of texts using the configured provider. Returns one
    L2-normalized vector per input text, in the same order."""
    if not texts:
        return []

    settings = get_settings()
    if settings.embedding_provider == "local":
        return _embed_local(texts)
    if settings.embedding_provider == "openai":
        return _embed_openai(texts)
    raise EmbeddingError(f"Unknown EMBEDDING_PROVIDER: {settings.embedding_provider}")


def embed_query(text: str) -> List[float]:
    """Convenience wrapper for embedding a single query string."""
    return embed_texts([text])[0]


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Both embed_texts outputs are already L2-normalized, so this is
    just a dot product - kept as a named function for readability at
    call sites and so callers don't have to know that detail."""
    va, vb = np.array(a), np.array(b)
    return float(np.dot(va, vb))