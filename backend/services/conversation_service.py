from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.conversation import Conversation, ChatMessage, LongTermMemory


def create_or_update_conversation(db: Session, thread_id: str, user_id: int, first_message: str | None = None):
    conversation = db.query(Conversation).filter(Conversation.thread_id == thread_id).first()

    if not conversation:
        title = "New Chat"
        if first_message:
            title = first_message.strip()[:40]
            if len(first_message.strip()) > 40:
                title += "..."

        conversation = Conversation(
            thread_id=thread_id,
            user_id=user_id,
            title=title,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(conversation)
    else:
        conversation.updated_at = datetime.now(timezone.utc)


def list_conversations(db: Session, user_id: int) -> list[Conversation]:
    return (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )


def get_conversation(db: Session, thread_id: str, user_id: int) -> Conversation | None:
    return (
        db.query(Conversation)
        .filter(Conversation.thread_id == thread_id, Conversation.user_id == user_id)
        .first()
    )


def delete_conversation(db: Session, thread_id: str):
    db.query(Conversation).filter(Conversation.thread_id == thread_id).delete()
    db.query(ChatMessage).filter(ChatMessage.thread_id == thread_id).delete()
    db.query(LongTermMemory).filter(LongTermMemory.thread_id == thread_id).delete()
    db.commit()


def save_chat_message(db: Session, thread_id: str, role: str, content: str, tools: list | None = None):
    msg = ChatMessage(
        thread_id=thread_id,
        role=role,
        content=content,
        tools=tools or [],
        created_at=datetime.now(timezone.utc),
    )
    db.add(msg)

    conversation = db.query(Conversation).filter(Conversation.thread_id == thread_id).first()
    if conversation:
        conversation.updated_at = datetime.now(timezone.utc)


def get_chat_history(db: Session, thread_id: str) -> list[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )


def search_chat_messages(db: Session, user_id: int, query: str, limit: int = 50) -> list[dict]:
    cleaned = query.strip() if query else ""
    if not cleaned:
        return []

    capped_limit = max(1, min(limit, 100))
    dialect_name = db.bind.dialect.name if db.bind else ""

    if dialect_name == "postgresql":
        ts_query = func.websearch_to_tsquery("simple", cleaned)
        tsv = func.to_tsvector("simple", func.coalesce(ChatMessage.content, ""))
        rank = func.ts_rank_cd(tsv, ts_query)
        snippet = func.ts_headline(
            "simple",
            func.coalesce(ChatMessage.content, ""),
            ts_query,
            "MaxFragments=2, MinWords=4, MaxWords=18",
        )

        rows = (
            db.query(
                Conversation.thread_id,
                Conversation.title,
                ChatMessage.role,
                ChatMessage.created_at,
                rank.label("rank"),
                snippet.label("snippet"),
            )
            .join(ChatMessage, ChatMessage.thread_id == Conversation.thread_id)
            .filter(Conversation.user_id == user_id)
            .filter(tsv.op("@@")(ts_query))
            .order_by(rank.desc(), ChatMessage.created_at.desc())
            .limit(capped_limit)
            .all()
        )
    else:
        rows = (
            db.query(
                Conversation.thread_id,
                Conversation.title,
                ChatMessage.role,
                ChatMessage.created_at,
                ChatMessage.content.label("snippet"),
            )
            .join(ChatMessage, ChatMessage.thread_id == Conversation.thread_id)
            .filter(Conversation.user_id == user_id)
            .filter(ChatMessage.content.ilike(f"%{cleaned}%"))
            .order_by(ChatMessage.created_at.desc())
            .limit(capped_limit)
            .all()
        )

    results = []
    for row in rows:
        results.append(
            {
                "thread_id": row.thread_id,
                "title": row.title,
                "role": row.role,
                "created_at": row.created_at.isoformat(),
                "snippet": row.snippet or "",
            }
        )
    return results


def save_memory(db: Session, thread_id: str, memory: str):
    item = LongTermMemory(
        thread_id=thread_id,
        memory=memory,
        created_at=datetime.now(timezone.utc),
    )
    db.add(item)
    db.commit()
    return "Memory saved successfully."


def search_memory(db: Session, thread_id: str, query: str) -> str:
    cleaned = query.strip() if query else ""

    base_query = db.query(LongTermMemory).filter(LongTermMemory.thread_id == thread_id)

    memories = []
    if cleaned:
        memories = (
            base_query
            .filter(LongTermMemory.memory.ilike(f"%{cleaned}%"))
            .order_by(LongTermMemory.created_at.desc())
            .limit(20)
            .all()
        )

    if not memories:
        memories = base_query.order_by(LongTermMemory.created_at.desc()).limit(20).all()

    if not memories:
        return "No saved memory found."

    return "\n".join([f"- {m.memory}" for m in memories])
