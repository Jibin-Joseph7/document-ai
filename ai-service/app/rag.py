# ai-service/app/rag.py
"""
Retrieval-Augmented Generation: retrieve the most relevant chunks for a
question, then produce an answer grounded in them.

Two answer modes, selected by LLM_PROVIDER (same setting used nowhere else
yet - this is its first consumer):

  'none'   (default) - extractive: rank actual sentences from the
           retrieved chunks by similarity to the question and return the
           best ones verbatim. No external call, fully local, and -
           importantly - never invents information that isn't in the
           documents, since it can only return text that's literally
           there.
  'openai' - generative: sends the retrieved chunks as context to an
           OpenAI chat completion with an instruction to answer only from
           that context. Like the embeddings 'openai' path, this is
           implemented and mock-tested but the real API is not reachable
           from this sandbox's network allowlist.

Either way, if retrieval finds nothing relevant, no LLM call is made at
all - there's nothing to ground an answer in, so we say so directly
instead of giving a model the opportunity to hallucinate one.
"""
import re
from dataclasses import dataclass
from typing import List, Optional

import requests

from app.config import get_settings
from app.embeddings import embed_query, embed_texts, cosine_similarity
from app.vector_store import query_similar

_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")

# Below this similarity, retrieved chunks are treated as "not actually
# relevant" rather than being forced into an answer - a low-relevance top
# hit is worse than admitting nothing useful was found. 0.15 was picked
# empirically against the local hashing embedding: a genuinely unrelated
# query against a small corpus can still show ~0.05-0.10 similarity from
# hash noise alone (see commit 16's test notes), so anything much below
# 0.15 lets clearly-unrelated questions slip through as "relevant".
MIN_RELEVANCE_SCORE = 0.15


@dataclass
class Source:
    document_id: int
    chunk_index: int
    text: str
    score: float


@dataclass
class AnswerResult:
    answer: str
    answer_type: str  # 'extractive' | 'generated' | 'no_context'
    sources: List[Source]


def _split_sentences(text: str) -> List[str]:
    return [s.strip() for s in _SENTENCE_RE.split(text) if s.strip()]


def _extractive_answer(question: str, chunks: List[dict]) -> AnswerResult:
    question_emb = embed_query(question)

    candidates = []  # (sentence, document_id, chunk_index)
    for chunk in chunks:
        for sentence in _split_sentences(chunk["text"]):
            candidates.append((sentence, chunk["document_id"], chunk["chunk_index"]))

    if not candidates:
        return AnswerResult(answer="", answer_type="extractive", sources=[])

    sentence_texts = [c[0] for c in candidates]
    sentence_embs = embed_texts(sentence_texts)
    scored = [
        (cosine_similarity(question_emb, emb), *meta)
        for emb, meta in zip(sentence_embs, candidates)
    ]
    scored.sort(key=lambda x: x[0], reverse=True)

    # Take the top few sentences, but don't repeat the same sentence twice
    # and cap how much we return so the "answer" stays answer-shaped
    # rather than becoming another whole chunk dump.
    top = scored[:3]
    answer_text = " ".join(s[1] for s in top)
    sources = [
        Source(document_id=doc_id, chunk_index=chunk_idx, text=sentence, score=round(score, 4))
        for score, sentence, doc_id, chunk_idx in top
    ]
    return AnswerResult(answer=answer_text, answer_type="extractive", sources=sources)


def _generated_answer(question: str, chunks: List[dict]) -> AnswerResult:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError(
            "LLM_PROVIDER=openai but OPENAI_API_KEY is not set. "
            "Set it in .env or switch LLM_PROVIDER=none for extractive answers."
        )

    context = "\n\n".join(
        f"[Source {i + 1}, document {c['document_id']}]: {c['text']}"
        for i, c in enumerate(chunks)
    )
    system_prompt = (
        "Answer the user's question using ONLY the context below. "
        "If the answer isn't in the context, say you don't know rather than guessing. "
        "Be concise.\n\nContext:\n" + context
    )

    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
            "temperature": 0.2,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    answer_text = data["choices"][0]["message"]["content"]

    sources = [
        Source(
            document_id=c["document_id"],
            chunk_index=c["chunk_index"],
            text=c["text"],
            score=round(1.0 - c["distance"], 4),
        )
        for c in chunks
    ]
    return AnswerResult(answer=answer_text, answer_type="generated", sources=sources)


def answer_question(
    question: str,
    document_ids: Optional[List[int]] = None,
    n_results: int = 5,
) -> AnswerResult:
    # Same empty-scope-means-empty-results contract as the search endpoint
    # (commit 15) - a user with zero visible documents gets zero context,
    # never an unfiltered search across everyone's documents.
    if document_ids is not None and len(document_ids) == 0:
        return AnswerResult(
            answer="You don't have access to any documents yet, so I can't answer questions about them.",
            answer_type="no_context",
            sources=[],
        )

    where = {"document_id": {"$in": document_ids}} if document_ids is not None else None
    question_embedding = embed_query(question)
    chunks = query_similar(question_embedding, n_results=n_results, where=where)

    relevant_chunks = [c for c in chunks if (1.0 - c["distance"]) >= MIN_RELEVANCE_SCORE]
    if not relevant_chunks:
        return AnswerResult(
            answer="I couldn't find relevant information in your documents to answer that question.",
            answer_type="no_context",
            sources=[],
        )

    settings = get_settings()
    if settings.llm_provider == "openai":
        return _generated_answer(question, relevant_chunks)
    return _extractive_answer(question, relevant_chunks)