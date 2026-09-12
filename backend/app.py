import json
from contextlib import asynccontextmanager

import certifi
import os

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

from dotenv import load_dotenv

load_dotenv()

import requests
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from config import settings
from api import auth_router, chat_router, voice_router
from api.voice import resolve_voice_tools


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.google_api_key:
        print("WARNING: GOOGLE_API_KEY is not set — chat requests will fail.")
    missing_voice = resolve_voice_tools()[3]
    if missing_voice:
        print(
            "WARNING: voice transcription is disabled — host is missing "
            + ", ".join(missing_voice)
            + ". /api/stt will return 503 until these are set."
        )
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
app.include_router(voice_router)

# Headers that describe the transport of one hop and must not be copied on.
_DROPPED_RESPONSE_HEADERS = {
    "content-encoding",
    "content-length",
    "transfer-encoding",
    "connection",
    "keep-alive",
}


@app.api_route("/ingest/{path:path}", methods=["GET", "POST", "OPTIONS", "HEAD"])
async def posthog_proxy(path: str, request: Request):
    """Forward PostHog capture traffic through the app origin.

    The browser SDK sends events to this same-origin path instead of the
    PostHog cloud host, so ad blockers that block that host let the events
    pass. Static assets go to the assets host; all other paths go to the
    ingestion host.
    """
    if path.startswith("static/"):
        upstream = settings.posthog_assets_host
    else:
        upstream = settings.posthog_ingestion_host

    body = await request.body()
    forward_headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in ("host", "content-length")
    }

    upstream_response = await run_in_threadpool(
        lambda: requests.request(
            request.method,
            f"{upstream}/{path}",
            params=request.query_params.multi_items(),
            data=body,
            headers=forward_headers,
            timeout=30,
        )
    )

    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers={
            key: value
            for key, value in upstream_response.headers.items()
            if key.lower() not in _DROPPED_RESPONSE_HEADERS
        },
    )


frontend_dist = os.path.join(os.path.dirname(__file__), "..", "dist")
app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000)
