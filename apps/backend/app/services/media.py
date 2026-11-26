"""Uploaded media: storage, validation, thumbnails, audio for transcription, signed playback URLs.

Files live under <LOCAL_STORAGE_PATH>/media/<kind>/<project_id>/<item_id><ext>; the
database keeps the path relative to that root. Browsers play them through
/api/v1/media/... URLs signed with SECRET_KEY, because a <video> tag cannot send
the bearer token. Signed URLs expire (MEDIA_URL_TTL_SECONDS) and are scoped to one item.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import shutil
import time
from pathlib import Path
from typing import AsyncIterator, Dict, List, Optional, Tuple

from fastapi import HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse

from app.core.config import settings

MEDIA_ROOT = (Path(settings.LOCAL_STORAGE_PATH).resolve() / "media")

VIDEO_EXTS = {".mp4": "video/mp4", ".m4v": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
              ".mkv": "video/x-matroska", ".avi": "video/x-msvideo"}
AUDIO_EXTS = {".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".aac": "audio/aac",
              ".ogg": "audio/ogg", ".flac": "audio/flac"}
ALLOWED_EXTS = {**VIDEO_EXTS, **AUDIO_EXTS}

CHUNK = 1024 * 1024
# Whisper APIs accept ~25 MB per request: 10-minute mono 48 kbps MP3 chunks are ~3.6 MB
AUDIO_CHUNK_SECONDS = 600


class MediaError(Exception):
    """The upload is not usable media (wrong type, too big, unreadable)."""


class MediaTooLarge(MediaError):
    """The upload passed MAX_UPLOAD_MB."""


def max_upload_bytes() -> int:
    return settings.MAX_UPLOAD_MB * 1024 * 1024


def kind_for(filename: str) -> Tuple[str, str]:
    """(extension, "VIDEO"|"AUDIO") for an allowed filename, else MediaError."""
    ext = Path(filename or "").suffix.lower()
    if ext in VIDEO_EXTS:
        return ext, "VIDEO"
    if ext in AUDIO_EXTS:
        return ext, "AUDIO"
    raise MediaError(f"Unsupported file type {ext or '(none)'}; use " + ", ".join(sorted(ALLOWED_EXTS)))


def abs_path(rel: str) -> Path:
    """Resolve a stored relative path, refusing anything outside the media root."""
    path = (MEDIA_ROOT / rel).resolve()
    if MEDIA_ROOT not in path.parents:
        raise MediaError("Invalid media path")
    return path


def rel_path(path: Path) -> str:
    return path.resolve().relative_to(MEDIA_ROOT).as_posix()


async def save_upload(upload: UploadFile, dest: Path) -> int:
    """Stream an upload to disk, stopping as soon as it passes the size limit."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    limit, size = max_upload_bytes(), 0
    try:
        with open(dest, "wb") as out:
            while chunk := await upload.read(CHUNK):
                size += len(chunk)
                if size > limit:
                    raise MediaTooLarge(f"File is larger than the {settings.MAX_UPLOAD_MB} MB limit")
                out.write(chunk)
    except BaseException:
        dest.unlink(missing_ok=True)
        raise
    if size == 0:
        dest.unlink(missing_ok=True)
        raise MediaError("The file is empty")
    return size


async def _run(*args: str, timeout: float) -> Tuple[int, bytes, bytes]:
    proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        out, err = await asyncio.wait_for(proc.communicate(), timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise MediaError(f"{args[0]} took longer than {int(timeout)}s")
    return proc.returncode, out, err


async def probe(path: Path) -> Dict:
    """Check the file really is audio/video (by content, not extension) and read its basics."""
    code, out, _ = await _run("ffprobe", "-v", "error", "-show_entries",
                              "format=duration,format_name:stream=codec_type,width,height",
                              "-of", "json", str(path), timeout=60)
    if code != 0:
        raise MediaError("This file could not be read as audio or video")
    data = json.loads(out or b"{}")
    streams = data.get("streams") or []
    video = next((s for s in streams if s.get("codec_type") == "video" and s.get("width")), None)
    audio = any(s.get("codec_type") == "audio" for s in streams)
    if not video and not audio:
        raise MediaError("This file has no audio or video stream")
    try:
        duration = float((data.get("format") or {}).get("duration") or 0) or None
    except ValueError:
        duration = None
    return {"duration": duration, "has_video": bool(video), "has_audio": audio,
            "width": (video or {}).get("width"), "height": (video or {}).get("height")}


async def make_thumbnail(src: Path, dest: Path, duration: Optional[float]) -> bool:
    """A 640px-wide JPEG from early in the video (skips black first frames)."""
    at = min(1.5, (duration or 0) / 2) if duration else 0
    code, _, _ = await _run("ffmpeg", "-y", "-v", "error", "-ss", f"{at:.2f}", "-i", str(src), "-frames:v", "1",
                            "-vf", "scale=640:-2", "-q:v", "4", str(dest), timeout=60)
    return code == 0 and dest.exists()


async def audio_chunks(src: Path, workdir: Path) -> List[Tuple[float, Path]]:
    """Mono 16 kHz MP3 pieces small enough for Whisper APIs, with their start offsets."""
    workdir.mkdir(parents=True, exist_ok=True)
    code, _, err = await _run("ffmpeg", "-y", "-v", "error", "-i", str(src), "-vn", "-ac", "1", "-ar", "16000",
                              "-b:a", "48k", "-f", "segment", "-segment_time", str(AUDIO_CHUNK_SECONDS),
                              str(workdir / "chunk%03d.mp3"), timeout=900)
    chunks = sorted(workdir.glob("chunk*.mp3"))
    if code != 0 or not chunks:
        raise MediaError("Could not extract the audio track: " + err.decode(errors="replace")[:200])
    return [(i * AUDIO_CHUNK_SECONDS, p) for i, p in enumerate(chunks)]


def remove(*rel_paths: Optional[str]) -> None:
    for rel in rel_paths:
        if rel:
            try:
                abs_path(rel).unlink(missing_ok=True)
            except (MediaError, OSError):
                pass


def remove_project(project_id) -> None:
    for kind in ("references", "publications", "productions"):
        shutil.rmtree(MEDIA_ROOT / kind / str(project_id), ignore_errors=True)


# ------------------------------------------------------------------ signed URLs

def _signature(kind: str, item_id: str, variant: str, expires: int) -> str:
    msg = f"{kind}:{item_id}:{variant}:{expires}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()[:40]


def signed_url(kind: str, item_id, variant: str) -> str:
    """Path under the API root, e.g. /media/references/<id>/file?expires=...&sig=..."""
    expires = int(time.time()) + settings.MEDIA_URL_TTL_SECONDS
    return f"/media/{kind}/{item_id}/{variant}?expires={expires}&sig={_signature(kind, str(item_id), variant, expires)}"


def check_signature(kind: str, item_id, variant: str, expires: int, sig: str) -> None:
    if expires < time.time():
        raise HTTPException(status_code=403, detail="This media link has expired; reload the page")
    if not hmac.compare_digest(sig, _signature(kind, str(item_id), variant, expires)):
        raise HTTPException(status_code=403, detail="Invalid media link")


# ------------------------------------------------------------------ streaming with Range

def _file_range(path: Path, start: int, end: int) -> AsyncIterator[bytes]:
    async def gen():
        with open(path, "rb") as f:
            f.seek(start)
            left = end - start + 1
            while left > 0:
                data = f.read(min(CHUNK, left))
                if not data:
                    break
                left -= len(data)
                yield data
    return gen()


def stream_file(path: Path, request: Request, content_type: str) -> StreamingResponse:
    """Serve a file with HTTP Range support, so players can seek without downloading it all."""
    if not path.exists():
        raise HTTPException(status_code=404, detail="Media file is missing")
    size = path.stat().st_size
    headers = {"Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600",
               "X-Content-Type-Options": "nosniff"}
    range_header = request.headers.get("range")
    if range_header and range_header.startswith("bytes="):
        first = range_header[6:].split(",")[0].strip()
        start_s, _, end_s = first.partition("-")
        try:
            if start_s:
                start = int(start_s)
                end = min(int(end_s), size - 1) if end_s else size - 1
            else:  # suffix range: last N bytes
                start, end = max(0, size - int(end_s)), size - 1
        except ValueError:
            start, end = 0, size - 1
        if start >= size or start > end:
            return StreamingResponse(iter(()), status_code=416, headers={**headers, "Content-Range": f"bytes */{size}"})
        headers.update({"Content-Range": f"bytes {start}-{end}/{size}", "Content-Length": str(end - start + 1)})
        return StreamingResponse(_file_range(path, start, end), status_code=206, media_type=content_type, headers=headers)
    headers["Content-Length"] = str(size)
    return StreamingResponse(_file_range(path, 0, size - 1), media_type=content_type, headers=headers)
