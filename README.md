# AI Flow

A full-stack AI chat application with JWT authentication, conversation scoping, document upload with RAG, and long-term memory.

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, Alembic, PostgreSQL + pgvector
- **Frontend**: React, Vite, Tailwind CSS
- **AI**: LangGraph, Google Gemini, Google embeddings
- **Auth**: JWT with bcrypt

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ with pgvector extension

## Setup

### 1. Clone and configure

```bash
git clone https://github.com/n3dhir/AI-Flow.git
cd AI-Flow
```

Create `backend/.env`:

```env
GOOGLE_API_KEY="your-google-api-key"
GOOGLE_MODEL="gemini-3.1-flash-lite"
TAVILY_API_KEY="your-tavily-api-key"

DATABASE_URL="postgresql://user:pass@localhost:5432/aiflow"

JWT_SECRET_KEY="your-secret-key"
ALLOWED_ORIGINS=["http://localhost:5173"]

# Voice input (optional). Set all three on every host that serves /api/stt,
# then restart the backend. When any is missing, voice transcription returns
# 503 and the backend logs a warning at startup.
WHISPER_BIN="/path/to/whisper-cli"
WHISPER_MODEL="/path/to/ggml-base.en.bin"
FFMPEG_BIN="ffmpeg"
```

### 2. Database setup

```bash
createdb aiflow
psql -d aiflow -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app:app --reload
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Create account |
| POST | `/api/login` | Sign in |
| GET | `/api/me` | Get current user |
| GET | `/api/model` | Get active model |
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/{id}/messages` | Get messages |
| DELETE | `/api/conversations/{id}` | Delete conversation |
| POST | `/api/chat` | Send message (SSE stream) |
| POST | `/api/upload` | Upload document |

## Project Structure

```
AI-Flow/
├── backend/
│   ├── agent/          # AI agent, tools, RAG
│   ├── api/            # Route handlers
│   ├── core/           # Security, JWT
│   ├── models/         # SQLAlchemy models
│   ├── schemas/        # Pydantic schemas
│   ├── services/       # Business logic
│   ├── migrations/     # Alembic migrations
│   ├── config.py       # Settings
│   ├── database.py     # DB connection
│   └── app.py          # FastAPI app
└── frontend/
    └── src/
        ├── components/ # React components
        ├── lib/        # API client, utilities
        └── App.jsx     # Main app
```

## Features

- JWT authentication with bcrypt password hashing
- Conversation isolation per user
- Streaming responses via Server-Sent Events
- Document upload (PDF, DOCX, TXT, MD, PY, CSV) with RAG
- Long-term memory across conversations
- Tool usage: calculator, weather, web search, document search
- Retry failed messages
- Markdown rendering with tables, code blocks, lists
