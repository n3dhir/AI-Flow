import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessageChunk, HumanMessage, ToolMessage
from psycopg import Connection
from sqlalchemy.orm import Session

from database import get_db
from core.security import get_current_user
from services import (
    create_or_update_conversation,
    list_conversations,
    get_conversation,
    delete_conversation,
    save_chat_message,
    get_chat_history,
)
from agent.agent import get_agent
from agent.rag import add_document_to_rag, delete_thread_documents
from config import settings
from schemas import ChatRequest

router = APIRouter(prefix="/api", tags=["chat"])


ALLOWED_UPLOAD_SUFFIXES = {".pdf", ".docx", ".txt", ".md", ".py", ".csv"}


def sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def purge_checkpoints(thread_id: str):
    try:
        with Connection.connect(settings.database_url, autocommit=True) as conn:
            tables = [
                row[0]
                for row in conn.execute(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                )
            ]
            for table in tables:
                columns = [
                    row[0]
                    for row in conn.execute(
                        "SELECT column_name FROM information_schema.columns WHERE table_name = %s",
                        (table,)
                    )
                ]
                if "thread_id" in columns:
                    conn.execute(f'DELETE FROM "{table}" WHERE thread_id = %s', (thread_id,))
    except Exception:
        pass


def friendly_error(exc: Exception) -> str:
    message = str(exc)

    if "429" in message or "Rate limit" in message:
        return (
            "\n\n⚠️ **LLM provider rate limit reached.**\n\n"
            "Options:\n"
            "- Wait for the quota reset\n"
            "- Top up credits or raise limits with your provider\n"
            "- Or set `GOOGLE_MODEL` in `backend/.env` to a different Gemini model"
        )

    if "502" in message or "upstream" in message.lower() or "provider_error" in message:
        return (
            "\n\n⚠️ **The LLM provider's upstream route failed** (not your request).\n\n"
            "Options:\n"
            "- Retry — transient upstream errors often clear in seconds\n"
            "- Check your provider status or its configured keys\n"
            "- Or set `GOOGLE_MODEL` in `backend/.env` to another available Gemini model"
        )

    return f"\n\n⚠️ Stream failed: {message}"


@router.get("/model")
def get_model():
    return {"model": settings.google_model}


@router.get("/conversations")
def get_conversations(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    conversations = list_conversations(db, current_user.id)

    return [
        {
            "thread_id": c.thread_id,
            "title": c.title,
            "updated_at": c.updated_at.isoformat(),
        }
        for c in conversations
    ]


@router.get("/conversations/{thread_id}/messages")
def get_thread_messages(thread_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    conversation = get_conversation(db, thread_id, current_user.id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = get_chat_history(db, thread_id)

    return [
        {
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.delete("/conversations/{thread_id}")
def remove_conversation(thread_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    conversation = get_conversation(db, thread_id, current_user.id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    delete_conversation(db, thread_id)

    try:
        purge_checkpoints(thread_id)
    except Exception:
        pass

    try:
        delete_thread_documents(thread_id)
    except Exception:
        pass

    return {"ok": True}


@router.post("/chat")
def chat(request: ChatRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    create_or_update_conversation(db, request.thread_id, current_user.id, first_message=request.message)
    save_chat_message(db, request.thread_id, "user", request.message)
    db.commit()

    config = {"configurable": {"thread_id": request.thread_id}}
    inputs = {"messages": [HumanMessage(content=request.message)]}

    def event_stream():
        collected_all: list[str] = []
        last_error: Exception | None = None
        interrupted = False
        completed = False

        model_name = settings.google_model
        announced_tools: set[str] = set()

        def push(text: str):
            collected_all.append(text)

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

        except Exception as exc:
            last_error = exc

            if collected_all:
                yield sse({"delta": "\n\n⚠️ _Model connection dropped mid-answer._"})
                interrupted = True

        if interrupted:
            pass
        elif not completed and last_error is not None:
            yield sse({"delta": friendly_error(last_error)})

        full_reply = "".join(collected_all).strip()
        if full_reply:
            try:
                save_chat_message(db, request.thread_id, "assistant", full_reply)
                db.commit()
            except Exception:
                db.rollback()

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/upload")
async def upload_document(
    thread_id: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = get_conversation(db, thread_id, current_user.id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

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
