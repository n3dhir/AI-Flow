from api.auth import router as auth_router
from api.chat import router as chat_router
from api.voice import router as voice_router

__all__ = ["auth_router", "chat_router", "voice_router"]
