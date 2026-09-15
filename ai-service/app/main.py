# ai-service/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import ingest, search, qa, summarize

settings = get_settings()

app = FastAPI(
    title="Document AI Service",
    description="Text extraction, chunking, embeddings, RAG Q&A, summarization, and auto-tagging.",
    version="0.1.0",
)

# The Node server (and, during local dev, a browser hitting this service
# directly) both need to call this API from a different origin/port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "document-ai-ai-service",
        "embedding_provider": settings.embedding_provider,
        "llm_provider": settings.llm_provider,
    }


app.include_router(ingest.router)
app.include_router(search.router)
app.include_router(qa.router)
app.include_router(summarize.router)
