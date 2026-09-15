# ai-service/app/config.py
"""
Centralized settings for the AI service, mirroring server/src/config/index.js
on the Node side: everything is read from the repo-root .env so both
services agree on shared values (ports, URLs) without duplicating them.
"""
from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# repo-root/.env  (this file lives at repo-root/ai-service/app/config.py)
REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = REPO_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_PATH), extra="ignore")

    # -- Service ---------------------------------------------------
    ai_service_port: int = 8000

    # -- Vector store ------------------------------------------------
    chroma_persist_dir: str = "./ai-service/chroma_store"

    # -- Chunking --------------------------------------------------
    # Sized in words rather than tokens: token count varies by embedding
    # model/tokenizer, but word count is a stable, model-agnostic proxy
    # that's easy to reason about and tune.
    chunk_size_words: int = 200
    chunk_overlap_words: int = 40

    # -- Embeddings ----------------------------------------------------
    # 'local'  -> sentence-transformers, no external calls, works offline
    # 'openai' -> OpenAI-compatible embeddings API (requires openai_api_key)
    embedding_provider: str = "local"
    openai_api_key: str = ""

    # -- LLM (Q&A / summarization) ------------------------------------
    # 'none'   -> extractive fallback (no external LLM calls)
    # 'openai' -> OpenAI-compatible chat completions API
    llm_provider: str = "none"
    llm_model: str = "gpt-4o-mini"

    @property
    def chroma_persist_path(self) -> Path:
        # Resolve relative to repo root, same convention as the Node config.
        p = Path(self.chroma_persist_dir)
        return p if p.is_absolute() else (REPO_ROOT / p)


@lru_cache
def get_settings() -> Settings:
    return Settings()