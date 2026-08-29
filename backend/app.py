import json
from contextlib import asynccontextmanager

import certifi
import os

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from config import settings
from api import auth_router, chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if not settings.google_api_key:
        print("WARNING: GOOGLE_API_KEY is not set — chat requests will fail.")
    yield


app = FastAPI(title="AI Flow API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
