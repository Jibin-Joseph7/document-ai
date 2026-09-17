# Document AI — AI-Powered Document Management & Knowledge Base System

A full-stack platform for uploading, organizing, searching, summarizing, and asking natural-language questions about documents using **Retrieval-Augmented Generation (RAG)**.

Supports:

* PDF
* DOCX
* TXT
* CSV
* XLSX

---

## ✨ Features

* 🔐 JWT authentication
* 👥 Role-based access control
* 📁 Folder organization
* 📄 Multi-format document upload
* 🔎 Keyword and semantic search
* 🤖 AI-powered document Q&A
* 📝 Automatic document summarization
* 🏷️ AI-assisted document tagging
* ⭐ Favorite documents
* 🔗 Document sharing and permissions
* 📊 Document analytics
* 🧠 RAG-based knowledge retrieval
* 💾 SQLite persistence for local development
* 🗄️ ChromaDB vector storage
* 🐳 Docker Compose deployment
* 🧪 End-to-end smoke testing

---

# 🏗️ Architecture

```text
                         Browser
                            │
                            ▼
                    ┌────────────────┐
                    │ React + Vite   │
                    │    Client      │
                    └───────┬────────┘
                            │ HTTP
                            ▼
                    ┌────────────────┐
                    │ Node + Express │
                    │      API       │
                    └───────┬────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
       ┌──────────────┐           ┌─────────────────┐
       │    SQLite    │           │ Python FastAPI  │
       │              │           │   AI Service    │
       │ Users        │           └────────┬────────┘
       │ Documents    │                    │
       │ Folders      │          ┌─────────┼─────────┐
       │ Tags         │          ▼         ▼         ▼
       │ Shares       │       Extract   Chunk    Embed
       │ Analytics    │          │         │         │
       └──────────────┘          └─────────┼─────────┘
                                           ▼
                                      ChromaDB
                                      Vector Store
                                           │
                                           ▼
                                      RAG / LLM
```

---

# 🧰 Tech Stack

### Frontend

* React 19
* Vite
* React Router
* Lucide React

### Backend

* Node.js
* Express
* SQLite
* better-sqlite3
* JWT
* bcryptjs
* Multer

### AI Service

* Python
* FastAPI
* Uvicorn
* ChromaDB
* Local embeddings
* Optional OpenAI-compatible LLM integration

### Storage

* SQLite — application database
* ChromaDB — vector database
* Local filesystem — uploaded documents

### Deployment

* Docker
* Docker Compose
* Nginx

---

# 📂 Repository Structure

```text
document-ai/
│
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── lib/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   ├── Dockerfile
│   └── package.json
│
├── ai-service/
│   ├── app/
│   │   ├── routers/
│   │   ├── extraction.py
│   │   ├── chunking.py
│   │   ├── embeddings.py
│   │   ├── summarization.py
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── uploads/
│
├── scripts/
│   └── smoke-test.ps1
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

# 🔄 How Document Processing Works

When a user uploads a document:

```text
Upload
  │
  ▼
Node/Express API
  │
  ▼
File stored locally
  │
  ▼
AI Service
  │
  ├── Extract text
  │
  ├── Split into chunks
  │
  ├── Generate embeddings
  │
  └── Store vectors in ChromaDB
          │
          ▼
       Document ready
```

When a user asks a question:

```text
User Question
      │
      ▼
Semantic Search
      │
      ▼
Relevant document chunks
      │
      ▼
RAG Context
      │
      ▼
LLM / Extractive Answer
      │
      ▼
Answer
```

The system retrieves relevant document content before generating an answer rather than expecting the model to know the uploaded documents beforehand.

---

# 🧠 Why These Technology Choices?

| Conventional Option    | This Project                | Reason                          |
| ---------------------- | --------------------------- | ------------------------------- |
| PostgreSQL             | SQLite                      | Zero-install local development  |
| pgvector / FAISS       | ChromaDB                    | Local persistent vector storage |
| Amazon S3              | Local `/uploads`            | No cloud credentials required   |
| External embedding API | Local embeddings by default | Works without API keys          |
| External LLM           | Pluggable LLM provider      | Can be upgraded later           |

The application database uses a relational schema designed so that migrating from SQLite to PostgreSQL later is straightforward.

---

# 🚀 Getting Started — Windows

## Requirements

Install:

* Node.js 18+
* Python 3.10+
* Git

Docker is optional.

> The project was developed and tested locally on Windows with Node.js 24.19.0.

---

## 1. Clone the Repository

Open **PowerShell**:

```powershell
git clone https://github.com/Jibin-Joseph7/document-ai.git
cd document-ai
```

Create the environment file:

```powershell
Copy-Item ".env.example" ".env"
```

---

# 2. Setup the Node Server

```powershell
cd server
npm install
npm run db:init
```

Optional demo data:

```powershell
npm run db:seed
```

The seed script creates demo accounts across different roles and departments.

The demo accounts use:

```text
Password: DemoPass123!
```

See:

```text
server/src/db/seed.js
```

for the complete demo account list.

Return to the project root:

```powershell
cd ..
```

---

# 3. Setup the AI Service

```powershell
cd ai-service
python -m venv .venv
```

Activate the virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

Return to the project root:

```powershell
cd ..
```

---

# 4. Setup the React Client

```powershell
cd client
npm install
```

Return to the project root:

```powershell
cd ..
```

---

# ▶️ Run the Application Locally

Open **three PowerShell terminals**.

### Terminal 1 — AI Service

```powershell
cd "C:\Users\jobin joseph\document-ai\ai-service"
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

AI service:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

---

### Terminal 2 — Node API

```powershell
cd "C:\Users\jobin joseph\document-ai\server"
npm run dev
```

API:

```text
http://localhost:5000/api
```

Health check:

```text
http://localhost:5000/api/health
```

---

### Terminal 3 — React Client

```powershell
cd "C:\Users\jobin joseph\document-ai\client"
npm run dev
```

Open:

```text
http://localhost:5173
```

---

# 🐳 Docker Compose

The project also includes Dockerfiles for all three services and a root `docker-compose.yml`.

From the project root:

```powershell
cd "C:\Users\jobin joseph\document-ai"
Copy-Item ".env.example" ".env"
docker compose up --build
```

Services:

| Service      | URL                       |
| ------------ | ------------------------- |
| React Client | http://localhost:3000     |
| Node API     | http://localhost:5000/api |
| AI Service   | http://localhost:8000     |

To add demo users after the containers are running:

```powershell
docker compose exec server npm run db:seed
```

### Docker verification note

The Docker configuration was reviewed for:

* Dockerfile consistency
* service networking
* environment variables
* persistent volumes
* API URLs
* health checks
* Compose configuration

The Docker Compose stack was not used as the primary local development environment during implementation. Local Windows services were used for live application testing.

---

# 🧪 Verification

The project includes an end-to-end Windows PowerShell smoke test:

```powershell
cd "C:\Users\jobin joseph\document-ai"
.\scripts\smoke-test.ps1
```

The test verifies:

```text
AI health
     ↓
Node API health
     ↓
User registration
     ↓
Document upload
     ↓
Real document ingestion
     ↓
Semantic search
     ↓
RAG Q&A
     ↓
Summarization
     ↓
Document deletion
```

The test checks actual API responses and persisted results rather than only checking whether the services started.

---

# 🔎 Supported AI Operations

## Semantic Search

Documents are converted into vector embeddings and stored in ChromaDB.

A search query is embedded and compared against stored document chunks to retrieve relevant content.

---

## 🤖 RAG Question Answering

The Q&A pipeline follows:

```text
Question
   ↓
Embedding
   ↓
Vector Search
   ↓
Relevant Chunks
   ↓
Context
   ↓
Answer
```

The system can use extractive answering locally and supports a pluggable LLM provider for generative responses.

---

## 📝 Summarization

Documents can be summarized using the available summarization pipeline.

The resulting summary is persisted with the document.

---

## 🏷️ Auto Tagging

The AI service can suggest:

* Document category
* Relevant keywords/tags

These can then be used for document organization and discovery.

---

# 🔐 Authentication & Authorization

The backend uses:

```text
JWT
+
bcrypt password hashing
+
Role-Based Access Control
```

The application supports different user roles and department-based organization.

Protected routes require a valid JWT.

---

# 📊 Document Management

Users can:

* Upload documents
* View documents
* Organize documents into folders
* Search documents
* Favorite documents
* Add tags
* Share documents
* Manage document permissions
* View document analytics
* Delete documents

---

# 💾 Data Storage

### SQLite

Stores application data such as:

```text
users
documents
folders
tags
document_tags
document_shares
document_analytics
search_queries
audit_logs
```

### ChromaDB

Stores document embeddings and associated vector metadata.

### Local Upload Storage

Uploaded files are stored under:

```text
/uploads
```

---

# ⚙️ Environment Configuration

Configuration is provided through:

```text
.env
```

Use:

```text
.env.example
```

as the starting template.

Important configuration areas include:

```text
JWT_SECRET
JWT_EXPIRES_IN
SQLITE_PATH
UPLOAD_DIR
MAX_UPLOAD_MB
AI_SERVICE_URL
EMBEDDING_PROVIDER
LLM_PROVIDER
```

Never commit real API keys or production secrets.

---

# 📌 Project Development Milestones

The project was developed through the following major milestones:

1. Project scaffold and tooling
2. Server configuration and database schema
3. User authentication
4. Authentication middleware and RBAC
5. Document, folder and tag models
6. File upload and CRUD
7. Sharing and permissions
8. Analytics
9. FastAPI AI service
10. Document text extraction
11. Text chunking
12. Embeddings
13. ChromaDB integration
14. Document ingestion pipeline
15. Semantic search
16. RAG Q&A
17. Summarization
18. Automatic tagging
19. Node ↔ AI service integration
20. React client and authentication
21. Document upload UI
22. Document/folder/tag UI
23. Search interface
24. Document viewer
25. AI assistant
26. Summarization interface
27. Sharing and permissions UI
28. Analytics dashboard
29. Docker Compose and demo seed data
30. Final polish and smoke testing

---

# 🛡️ Production Considerations

This project is designed as a strong full-stack/AI application foundation.

For a production deployment, the following could be added:

* PostgreSQL
* S3-compatible object storage
* Managed vector database
* Production LLM provider
* Redis/job queue
* Background ingestion workers
* Rate limiting
* HTTPS
* Centralized logging
* Monitoring
* Automated CI/CD
* Production secret management

---

# 📜 License

This project is intended for educational, portfolio, and development purposes.
