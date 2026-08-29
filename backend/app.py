import json
from contextlib import asynccontextmanager

import certifi
from dotenv import load_dotenv
import os

load_dotenv()

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routes.auth import router as auth_router
from routes.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if not os.environ.get("GOOGLE_API_KEY"):
        print("WARNING: GOOGLE_API_KEY is not set — chat requests will fail.")
    yield


app = FastAPI(title="AI Flow API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=json.loads(os.environ.get("ALLOWED_ORIGINS", '["http://localhost:5173"]')),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
