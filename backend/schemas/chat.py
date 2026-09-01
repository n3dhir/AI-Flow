from pydantic import BaseModel


class ChatRequest(BaseModel):
    thread_id: str
    message: str


class DeleteDocumentRequest(BaseModel):
    source: str
