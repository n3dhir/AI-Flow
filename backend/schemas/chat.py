from pydantic import BaseModel


class ChatRequest(BaseModel):
    thread_id: str
    message: str


class ConversationResponse(BaseModel):
    thread_id: str
    title: str
    updated_at: str


class MessageResponse(BaseModel):
    role: str
    content: str
    created_at: str


class ModelResponse(BaseModel):
    model: str


class UploadResponse(BaseModel):
    filename: str
    chunks: int
