"""Uploaded files as library references and as a publication's finished cut.

Upload flow for the Library: save → ffprobe (must really be audio/video) → thumbnail →
Reference row (status INDEXING) → background transcription with the uploader's own
OpenAI/Groq key → INDEXED. The transcript uses the same {segments: [{start, text}]}
shape as captured captions, so investigations cite timestamps for uploads too.
"""

from __future__ import annotations

import logging
import shutil
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.project import Project
from app.models.publication import Publication
from app.models.reference import MediaType, Reference, ReferenceStatus
from app.services import llm, media

logger = logging.getLogger(__name__)


def _title_from(filename: str) -> str:
    stem = Path(filename or "upload").stem.replace("_", " ").replace("-", " ").strip()
    return (stem or "Uploaded media")[:500]


async def _store(kind: str, project_id: uuid.UUID, item_id: uuid.UUID, upload: UploadFile) -> dict:
    """Save, verify and thumbnail one file; returns facts about it. Cleans up on any failure."""
    ext, _ = media.kind_for(upload.filename or "")
    dest = media.MEDIA_ROOT / kind / str(project_id) / f"{item_id}{ext}"
    size = await media.save_upload(upload, dest)
    try:
        info = await media.probe(dest)
        poster = None
        if info["has_video"]:
            thumb = dest.with_suffix(".jpg")
            if await media.make_thumbnail(dest, thumb, info["duration"]):
                poster = media.rel_path(thumb)
    except BaseException:
        dest.unlink(missing_ok=True)
        raise
    return {
        "path": media.rel_path(dest),
        "poster_path": poster,
        "filename": (upload.filename or "")[:255],
        "size": size,
        "content_type": media.ALLOWED_EXTS[ext],
        "duration": info["duration"],
        "has_video": info["has_video"],
        "has_audio": info["has_audio"],
        "width": info["width"],
        "height": info["height"],
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }


async def create_reference_upload(db: AsyncSession, project: Project, upload: UploadFile,
                                  title: Optional[str] = None) -> Reference:
    reference_id = uuid.uuid4()
    stored = await _store("references", project.id, reference_id, upload)
    reference = Reference(
        id=reference_id,
        project_id=project.id,
        title=(title or "").strip()[:500] or _title_from(upload.filename or ""),
        media_type=MediaType.VIDEO if stored["has_video"] else MediaType.AUDIO,
        local_path=stored["path"],
        duration=stored["duration"],
        status=ReferenceStatus.INDEXING if stored["has_audio"] else ReferenceStatus.INDEXED,
        error_message=None if stored["has_audio"] else "This video has no audio track, so there is no transcript.",
        reference_metadata={"upload": {k: v for k, v in stored.items() if k not in ("path", "poster_path")},
                            "thumbnail_path": stored["poster_path"]},
    )
    db.add(reference)
    await db.commit()
    await db.refresh(reference)
    return reference


async def transcribe_reference(reference_id: uuid.UUID, user_id: uuid.UUID, language: Optional[str]) -> None:
    """Background job: transcribe an uploaded reference with the uploader's own key."""
    async with AsyncSessionLocal() as db:
        reference = await db.get(Reference, reference_id)
        if reference is None or not reference.local_path:
            return
        await llm.use_user(db, user_id)
        workdir = Path(tempfile.mkdtemp(prefix="transcribe-"))
        try:
            segments, texts, detected = [], [], None
            for offset, chunk in await media.audio_chunks(media.abs_path(reference.local_path), workdir):
                part = await llm.transcribe(chunk, language)
                detected = detected or part.get("language")
                texts.append(part["text"])
                segments += [{**s, "start": round(s["start"] + offset, 2), "end": round(s["end"] + offset, 2)}
                             for s in part["segments"]]
            transcript = {"language": detected or language, "automatic": True, "source": "upload",
                          "segments": segments, "text": " ".join(t for t in texts if t).strip()}
            reference.reference_metadata = {**(reference.reference_metadata or {}), "transcript": transcript}
            reference.captions = transcript["text"] or None
            reference.error_message = None if segments else "No speech was found in this file."
        except llm.LLMUnavailable as e:
            reference.error_message = f"No transcript yet: {e}"
        except (llm.LLMError, media.MediaError) as e:
            reference.error_message = f"Transcription failed: {e}"
        except Exception as e:  # keep the upload usable whatever went wrong
            logger.exception("Transcription of reference %s failed", reference_id)
            reference.error_message = f"Transcription failed: {type(e).__name__}"
        finally:
            shutil.rmtree(workdir, ignore_errors=True)
        reference.status = ReferenceStatus.INDEXED
        await db.commit()


def reference_files(reference: Reference) -> tuple:
    return reference.local_path, (reference.reference_metadata or {}).get("thumbnail_path")


async def attach_publication_video(db: AsyncSession, project: Project, publication: Publication,
                                   upload: UploadFile) -> Publication:
    """Store the finished cut for a publication (replacing any earlier one)."""
    old = (publication.publication_metadata or {}).get("video_file") or {}
    stored = await _store("publications", project.id, uuid.uuid4(), upload)
    if not stored["has_video"]:
        media.remove(stored["path"])
        raise media.MediaError("A finished cut must be a video file")
    publication.publication_metadata = {**(publication.publication_metadata or {}), "video_file": stored}
    await db.commit()
    await db.refresh(publication)
    media.remove(old.get("path"), old.get("poster_path"))
    return publication


async def detach_publication_video(db: AsyncSession, publication: Publication) -> Publication:
    meta = dict(publication.publication_metadata or {})
    old = meta.pop("video_file", None) or {}
    publication.publication_metadata = meta
    await db.commit()
    await db.refresh(publication)
    media.remove(old.get("path"), old.get("poster_path"))
    return publication
