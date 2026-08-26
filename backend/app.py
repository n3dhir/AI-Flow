import json
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path

import certifi
from dotenv import load_dotenv
import os

load_dotenv()

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessageChunk, HumanMessage, ToolMessage
from pydantic import BaseModel

from agent import get_agent
from database import (
    create_or_update_conversation,
    delete_conversation,
    get_chat_history,
    init_db,
    list_conversations,
    save_chat_message,
)
from rag import add_document_to_rag, delete_thread_documents
from utils import resolveModelChain


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if not os.environ.get("OPENROUTER_API_KEY"):
        print("WARNING: OPENROUTER_API_KEY is not set — chat requests will fail.")
    yield


app = FastAPI(title="AI Flow API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    thread_id: str
    message: str


ALLOWED_UPLOAD_SUFFIXES = {".pdf", ".docx", ".txt", ".md", ".py", ".csv"}


def sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def purge_checkpoints(thread_id: str):
    conn = sqlite3.connect("checkpoints/agent_checkpoint.db", check_same_thread=False)
    try:
        tables = [
            row[0]
            for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        ]
        for table in tables:
            columns = [col[1] for col in conn.execute(f"PRAGMA table_info({table})")]
            if "thread_id" in columns:
                conn.execute(f"DELETE FROM {table} WHERE thread_id = ?", (thread_id,))
        conn.commit()
    finally:
        conn.close()


@app.get("/api/model")
def get_model():
    return {"model": resolveModelChain()[0]}


@app.get("/api/conversations")
def get_conversations():
    conversations = list_conversations()

    return [
        {
            "thread_id": c.thread_id,
            "title": c.title,
            "updated_at": c.updated_at.isoformat(),
        }
        for c in conversations
    ]


@app.get("/api/conversations/{thread_id}/messages")
def get_thread_messages(thread_id: str):
    messages = get_chat_history(thread_id)

    return [
        {
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@app.delete("/api/conversations/{thread_id}")
def remove_conversation(thread_id: str):
    delete_conversation(thread_id)

    try:
        purge_checkpoints(thread_id)
    except sqlite3.Error:
        pass

    try:
        delete_thread_documents(thread_id)
    except Exception:
        pass

    return {"ok": True}


def friendly_error(exc: Exception) -> str:
    message = str(exc)

    if "429" in message or "Rate limit" in message:
        return (
            "\n\n⚠️ **LLM provider rate limit reached.**\n\n"
            "Options:\n"
            "- Wait for the quota reset\n"
            "- Top up credits or raise limits with your provider\n"
            "- Or point `OPENAI_API_BASE_URL` / `AI_MODEL` in `backend/.env` at a different provider or model"
        )

    if "502" in message or "upstream" in message.lower() or "provider_error" in message:
        return (
            "\n\n⚠️ **The LLM provider's upstream route failed** (not your request).\n\n"
            "Options:\n"
            "- Retry — transient upstream errors often clear in seconds\n"
            "- Check your provider/router status or its configured keys and routes\n"
            "- Or set `AI_MODEL` in `backend/.env` to another available model (e.g. `auto`)"
        )

    return f"\n\n⚠️ Stream failed: {message}"


@app.post("/api/chat")
def chat(request: ChatRequest):
    create_or_update_conversation(request.thread_id, first_message=request.message)
    save_chat_message(request.thread_id, "user", request.message)

    config = {"configurable": {"thread_id": request.thread_id}}
    inputs = {"messages": [HumanMessage(content=request.message)]}

    def event_stream():
        collected_all: list[str] = []
        last_error: Exception | None = None
        interrupted = False
        completed = False

        for model_name in resolveModelChain():
            announced_tools: set[str] = set()
            collected_attempt: list[str] = []

            def push(text: str):
                collected_all.append(text)
                collected_attempt.append(text)

            try:
                wf = get_agent(model_name)

                yield sse({"meta": {"model": model_name}})

                for chunk, metadata in wf.stream(
                    inputs,
                    config=config,
                    stream_mode="messages",
                ):
                    if isinstance(chunk, ToolMessage):
                        name = chunk.name or "tool"

                        raw = chunk.content
                        if isinstance(raw, list):
                            raw = "".join(
                                part.get("text", "")
                                for part in raw
                                if isinstance(part, dict)
                            )

                        preview = " ".join(str(raw).split())[:180]
                        ok = getattr(chunk, "status", "success") != "error"

                        announced_tools.discard(name)
                        yield sse({"tool_end": {"name": name, "ok": ok, "preview": preview}})
                        continue

                    if not isinstance(chunk, AIMessageChunk):
                        continue

                    if metadata.get("langgraph_node") != "chat_node":
                        continue

                    for call_chunk in getattr(chunk, "tool_call_chunks", None) or []:
                        name = call_chunk.get("name")
                        if name and name not in announced_tools:
                            announced_tools.add(name)
                            yield sse({"tool_start": {"name": name}})

                    text = chunk.content
                    if isinstance(text, list):
                        text = "".join(
                            part.get("text", "")
                            for part in text
                            if isinstance(part, dict)
                        )

                    if not text:
                        continue

                    push(text)
                    yield sse({"delta": text})

                completed = True
                break

            except Exception as exc:
                last_error = exc

                if collected_attempt:
                    yield sse({"delta": "\n\n⚠️ _Model connection dropped mid-answer._"})
                    interrupted = True
                    break

                continue

        if interrupted:
            pass
        elif not completed and last_error is not None:
            yield sse({"delta": friendly_error(last_error)})

        full_reply = "".join(collected_all).strip()
        if full_reply:
            try:
                save_chat_message(request.thread_id, "assistant", full_reply)
            except Exception:
                pass

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/upload")
async def upload_document(thread_id: str = Form(...), file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()

    if suffix not in ALLOWED_UPLOAD_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload PDF, DOCX, TXT, MD, PY, or CSV.",
        )

    destination = Path("uploads") / f"{thread_id}_{file.filename}"
    content = await file.read()
    destination.write_bytes(content)

    try:
        result = await run_in_threadpool(add_document_to_rag, str(destination), thread_id)
    except ValueError as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(exc))

    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
