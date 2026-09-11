# Document AI — AI-Powered Document Management & Knowledge Base System

A full-stack platform for uploading, organizing, searching, summarizing, and
asking natural-language questions about documents (PDF, DOCX, TXT, CSV, XLSX)
using Retrieval-Augmented Generation (RAG).

## Architecture

```
Browser (React)
      │
      ▼
Node/Express API  ──────► SQLite (users, documents, folders, tags, shares)
      │                         (Postgres-compatible schema)
      │
      ▼
Python AI Service (FastAPI)
      │
      ├─► Text extraction (pdf / docx / csv / xlsx / txt)
      ├─► Chunking
      ├─► Embeddings  ──► ChromaDB (vector store)
      └─► LLM Q&A / Summarization
```

## Why these choices

| Doc suggests   | This repo uses         | Why |
|----------------|-------------------------|-----|
| PostgreSQL     | SQLite (same schema shape) | Zero-install local dev; swap the connection string later |
| pgvector/FAISS | ChromaDB (local, file-based) | No external vector DB service to stand up |
| Amazon S3      | Local disk `/uploads`   | No cloud creds required to run locally |
| Any LLM API    | Pluggable — local embeddings by default, OpenAI-compatible key optional | Works out of the box, upgradeable |

## Repo layout

```
document-ai/
├── client/        # React frontend (Vite)
├── server/        # Node/Express API + auth + DB
├── ai-service/    # Python FastAPI: parsing, embeddings, RAG, summarization
└── uploads/       # Local file storage (dev)
```

## Commit plan (this build)

1. Project scaffold, tooling, README ← *you are here*
2. Server: config, DB schema, connection
3. Server: User model + JWT auth (register/login)
4. Server: auth middleware + role-based access control
5. Server: Document model + folders/tags
6. Server: file upload endpoint (multer) + document CRUD
7. Server: sharing & permissions endpoints
8. Server: analytics endpoints
9. AI service: FastAPI app skeleton + config
10. AI service: text extraction (pdf/docx/txt/csv/xlsx)
11. AI service: chunking
12. AI service: embeddings (local model, pluggable)
13. AI service: ChromaDB vector store integration
14. AI service: ingestion pipeline (extract → chunk → embed → store)
15. AI service: semantic search endpoint
16. AI service: RAG Q&A endpoint
17. AI service: summarization endpoint
18. AI service: auto-tagging
19. Server ↔ AI-service integration client
20. Client: scaffold (Vite/React), routing, auth pages
21. Client: DocumentUpload component
22. Client: document list / folders / tags UI
23. Client: SearchBar (keyword + semantic)
24. Client: DocumentViewer
25. Client: ChatAssistant (AI Q&A UI)
26. Client: summarization UI
27. Client: sharing/permissions UI
28. Client: analytics dashboard
29. Docker Compose for full stack + seed script
30. Final polish: error handling, README run instructions, smoke tests