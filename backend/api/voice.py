import logging
import re
import shutil
import subprocess
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from config import settings
from core.security import get_current_user

router = APIRouter(prefix="/api", tags=["voice"])

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent.parent

ALLOWED_AUDIO_SUFFIXES = {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".opus", ".flac"}

# Shown to the user for any host-side failure. It never names an env var or a
# binary path, because those are backend configuration details.
_UNAVAILABLE_DETAIL = "Voice transcription is unavailable right now. Try again later."

# whisper.cpp txt lines look like: "[00:00:00.000 --> 00:00:05.000]  hello"
_TIMESTAMP_LINE = re.compile(r"^\[.*?\-\->.*?\]\s*")


def _audio_tmp_dir() -> Path:
    d = Path(settings.audio_tmp_dir)
    if not d.is_absolute():
        d = BACKEND_DIR / d
    d.mkdir(parents=True, exist_ok=True)
    return d


def _resolve_exe(configured: str) -> str | None:
    """Return a usable binary path, or None when it is not on the host."""
    configured = (configured or "").strip()
    if configured and Path(configured).is_file():
        return configured
    return shutil.which(configured) if configured else None


def _resolve_model(configured: str) -> str | None:
    """Return the ggml model path, or None when the file is missing."""
    configured = (configured or "").strip()
    if configured and Path(configured).is_file():
        return configured
    return None


def resolve_voice_tools() -> tuple[str | None, str | None, str | None, list[str]]:
    """Resolve the transcription dependencies against the host.

    Returns the whisper binary, model and ffmpeg paths (None when absent) plus
    the names of the settings that are missing. The names are empty when the
    host can transcribe. Used by the endpoint and the startup health check.
    """
    whisper_bin = _resolve_exe(settings.whisper_bin)
    whisper_model = _resolve_model(settings.whisper_model)
    ffmpeg = _resolve_exe(settings.ffmpeg_bin)
    missing = [
        name
        for name, resolved in (
            ("WHISPER_BIN", whisper_bin),
            ("WHISPER_MODEL", whisper_model),
            ("FFMPEG_BIN", ffmpeg),
        )
        if not resolved
    ]
    return whisper_bin, whisper_model, ffmpeg, missing


def _parse_whisper_txt(txt_path: Path) -> str:
    """Extract plain transcript from whisper.cpp -otxt output."""
    lines: list[str] = []
    for raw in txt_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = _TIMESTAMP_LINE.sub("", raw).strip()
        if line:
            lines.append(line)
    return " ".join(lines).strip()


@router.post("/stt")
async def transcribe_audio(
    audio: UploadFile = File(...),
    thread_id: str = Form("default"),
    current_user=Depends(get_current_user),
):
    _ = (thread_id, current_user)  # thread kept for logging/analytics parity
    suffix = Path(audio.filename or "").suffix.lower() or ".webm"
    if suffix not in ALLOWED_AUDIO_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio type '{suffix}'. Use webm, wav, mp3, m4a, ogg or flac.",
        )

    data = await audio.read()
    max_bytes = settings.stt_max_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Audio too large ({len(data) // (1024 * 1024)}MB). Limit is {settings.stt_max_mb}MB.",
        )
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio upload.")

    whisper_bin, whisper_model, ffmpeg, missing = resolve_voice_tools()
    if missing:
        logger.error(
            "Voice transcription unavailable — host is missing: %s", ", ".join(missing)
        )
        raise HTTPException(status_code=503, detail=_UNAVAILABLE_DETAIL)

    tmp_dir = _audio_tmp_dir()
    in_path = tmp_dir / f"stt_in_{uuid.uuid4().hex}{suffix}"
    conv_path = tmp_dir / f"stt_conv_{uuid.uuid4().hex}.wav"
    out_prefix = tmp_dir / f"stt_out_{uuid.uuid4().hex}"
    out_txt = Path(str(out_prefix) + ".txt")
    try:
        in_path.write_bytes(data)
        # Browsers record webm/opus which whisper-cli cannot decode —
        # normalize everything to 16kHz mono WAV first.
        try:
            conv = await run_in_threadpool(
                lambda: subprocess.run(
                    [ffmpeg, "-y", "-i", str(in_path),
                     "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
                     str(conv_path)],
                    capture_output=True, text=True, timeout=60,
                )
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Audio conversion timed out.")
        if conv.returncode != 0 or not conv_path.is_file() or conv_path.stat().st_size == 0:
            logger.warning(
                "ffmpeg could not decode the upload: %s", (conv.stderr or "").strip()[-500:]
            )
            raise HTTPException(
                status_code=400,
                detail="Could not decode the recording. Record again.",
            )
        cmd = [
            whisper_bin,
            "-m", whisper_model,
            "-f", str(conv_path),
            "-otxt",
            "-of", str(out_prefix),
            "-nt",
        ]
        try:
            proc = await run_in_threadpool(
                lambda: subprocess.run(
                    cmd, capture_output=True, text=True, timeout=settings.stt_timeout_s
                )
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(
                status_code=504,
                detail=f"Transcription timed out after {settings.stt_timeout_s}s. Try a shorter recording.",
            )
        if proc.returncode != 0 or not out_txt.is_file():
            logger.error(
                "whisper transcription failed (rc=%s): %s",
                proc.returncode,
                (proc.stderr or "").strip()[-500:],
            )
            raise HTTPException(
                status_code=500,
                detail="Transcription failed. Try again.",
            )
        transcript = await run_in_threadpool(lambda: _parse_whisper_txt(out_txt))
        if not transcript:
            raise HTTPException(
                status_code=500, detail="Transcription produced no text. Try speaking closer/louder."
            )
        return {"transcript": transcript}
    finally:
        in_path.unlink(missing_ok=True)
        conv_path.unlink(missing_ok=True)
        out_txt.unlink(missing_ok=True)
