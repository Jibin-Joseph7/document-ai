# ai-service/app/tagging.py
"""
Suggests a category and tags for a document, matching the product spec's
example: "Annual Financial Report.pdf -> Category: Finance, Tags:
Financial Report, Revenue, Expenses, Annual".

Reuses reconstruct_document_text from summarization.py rather than
re-reading the file, same reasoning as summarization: the chunks are
already in the vector store from ingestion.
"""
import re
from collections import Counter
from dataclasses import dataclass
from typing import List

import requests

from app.config import get_settings
from app.summarization import reconstruct_document_text, NoContentError  # re-exported

__all__ = ["suggest_tags", "TaggingResult", "NoContentError"]

_WORD_RE = re.compile(r"[a-zA-Z]+")

# Deliberately small and unsurprising - a real stopword list has hundreds
# of entries, but this covers what actually shows up in business
# documents often enough to pollute frequency-based keyword extraction.
_STOPWORDS = frozenset(
    """
    a an the this that these those is are was were be been being have has had
    do does did will would shall should may might must can could
    and or but if then else when while for with without to of in on at by from
    as into onto through over under above below between among
    it its it's they them their there here who whom whose which what
    not no nor so than too very just also only more most such
    i you he she we our your his her my me him us
    page pages section chapter document sheet
    """.split()
)

# Category -> keywords whose presence votes for that category. Deliberately
# small/curated rather than exhaustive; a real deployment would probably
# also let admins define categories, or use an LLM (see the 'openai' path
# below) for more nuanced classification.
CATEGORY_KEYWORDS = {
    "Finance": {
        "budget", "revenue", "expense", "expenses", "financial", "invoice",
        "accounting", "tax", "profit", "cost", "costs", "quarterly", "fiscal",
        "payment", "accounts", "audit",
    },
    "HR": {
        "employee", "employees", "leave", "benefits", "onboarding", "payroll",
        "recruitment", "handbook", "vacation", "policy", "hire", "hiring",
        "compensation", "workplace", "personnel",
    },
    "Technology": {
        "api", "database", "server", "architecture", "software", "code",
        "authentication", "deployment", "infrastructure", "backend", "frontend",
        "endpoint", "repository", "algorithm", "framework",
    },
    "Legal": {
        "contract", "agreement", "compliance", "liability", "clause", "terms",
        "conditions", "confidentiality", "jurisdiction", "indemnification",
        "warranty", "breach", "regulation",
    },
    "Marketing": {
        "campaign", "brand", "advertising", "audience", "engagement",
        "content", "social", "promotion", "customer", "conversion", "seo",
    },
    "Sales": {
        "deal", "pipeline", "quota", "lead", "leads", "prospect", "closing",
        "negotiation", "proposal", "client", "opportunity",
    },
    "Operations": {
        "process", "logistics", "workflow", "supply", "chain", "inventory",
        "procurement", "vendor", "scheduling", "efficiency",
    },
}


@dataclass
class TaggingResult:
    document_id: int
    method: str  # 'keyword' | 'generated'
    category: str
    tags: List[str]


def _tokenize(text: str) -> List[str]:
    return [w.lower() for w in _WORD_RE.findall(text)]


def classify_category(text: str) -> str:
    words = set(_tokenize(text))
    best_category = "General"
    best_score = 0
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = len(words & keywords)
        if score > best_score:
            best_score = score
            best_category = category
    return best_category


def extract_keywords(text: str, max_tags: int = 5) -> List[str]:
    words = [w for w in _tokenize(text) if w not in _STOPWORDS and len(w) > 2]
    if not words:
        return []

    counts = Counter(words)
    # Also count adjacent-word bigrams so multi-word concepts like
    # "annual leave" or "financial report" can surface as a single tag
    # rather than only their individual words.
    bigrams = [f"{a} {b}" for a, b in zip(words, words[1:])]
    bigram_counts = Counter(bigrams)

    # A bigram is only worth surfacing as its own tag if it's genuinely
    # repeated - a one-off adjacent pair is just noise.
    candidates = Counter()
    for word, count in counts.items():
        candidates[word] = count
    for bigram, count in bigram_counts.items():
        if count >= 2:
            candidates[bigram] = count + 0.5  # slight bonus: more specific than either word alone

    ranked = [w for w, _ in candidates.most_common(max_tags * 3)]

    # Drop single words that are already fully contained in a selected
    # bigram tag ("annual" + "leave" both redundant once "annual leave" is
    # picked), so the final tag list isn't repetitive.
    selected: List[str] = []
    for term in ranked:
        if len(selected) >= max_tags:
            break
        if any(term != s and term in s.split() for s in selected):
            continue
        selected.append(term)

    return [t.title() for t in selected]


def _keyword_tags(document_id: int, text: str, max_tags: int) -> TaggingResult:
    return TaggingResult(
        document_id=document_id,
        method="keyword",
        category=classify_category(text),
        tags=extract_keywords(text, max_tags),
    )


def _generated_tags(document_id: int, text: str, max_tags: int) -> TaggingResult:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError(
            "LLM_PROVIDER=openai but OPENAI_API_KEY is not set. "
            "Set it in .env or switch LLM_PROVIDER=none for keyword-based tagging."
        )

    prompt = (
        f"Suggest a single category and up to {max_tags} short tags for this document. "
        'Respond ONLY as JSON: {"category": "...", "tags": ["...", "..."]}\n\n'
        "Document:\n" + text[:4000]
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
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        },
        timeout=30,
    )
    resp.raise_for_status()
    import json

    content = json.loads(resp.json()["choices"][0]["message"]["content"])
    return TaggingResult(
        document_id=document_id,
        method="generated",
        category=content.get("category", "General"),
        tags=content.get("tags", [])[:max_tags],
    )


def suggest_tags(document_id: int, max_tags: int = 5) -> TaggingResult:
    text = reconstruct_document_text(document_id)  # raises NoContentError if never ingested

    settings = get_settings()
    if settings.llm_provider == "openai":
        return _generated_tags(document_id, text, max_tags)
    return _keyword_tags(document_id, text, max_tags)