"""Reference capture: turn a video URL into a library Reference with real metadata and captions.

Metadata and captions are fetched synchronously (a few seconds per video) so
the reference is complete when the request returns; the video file itself is
not downloaded (analysis works from the transcript and metadata).
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.reference import MediaType, Platform, Reference, ReferenceStatus
from app.services.video_sources import VideoInfo, fetch_transcript, video_details


class DuplicateReference(Exception):
    def __init__(self, reference: Reference):
        self.reference = reference


def _apply(reference: Reference, info: VideoInfo, transcript) -> None:
    reference.title = info.title[:500]
    reference.description = info.description
    reference.creator_name = info.creator
    reference.creator_id = info.creator_id
    reference.source_platform = Platform(info.platform) if info.platform else None
    reference.thumbnail_url = info.thumbnail_url
    reference.duration = info.duration
    reference.published_at = info.published_at
    reference.engagement_metrics = {
        "views": info.views,
        "likes": info.likes,
        "comments": info.comments,
        "followers": info.followers,
        "engagement_rate": info.engagement_rate,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    reference.hashtags = list(dict.fromkeys(info.hashtags + info.tags))[:40]
    reference.captions = transcript["text"] if transcript else None
    reference.reference_metadata = {
        **(reference.reference_metadata or {}),
        "video_id": info.video_id,
        "tags": info.tags,
        "transcript": transcript,
    }
    reference.status = ReferenceStatus.INDEXED
    reference.error_message = None


async def capture_reference(db: AsyncSession, project: Project, url: str) -> Reference:
    url = url.strip()
    existing = await db.scalar(
        select(Reference).where(Reference.project_id == project.id, Reference.source_url == url)
    )
    if existing is not None:
        raise DuplicateReference(existing)

    info = await video_details(url)  # raises VideoSourceError with a readable message
    # Re-check with the canonical URL (youtu.be links, tracking params...)
    if info.url and info.url != url:
        existing = await db.scalar(
            select(Reference).where(Reference.project_id == project.id, Reference.source_url == info.url)
        )
        if existing is not None:
            raise DuplicateReference(existing)

    transcript = await fetch_transcript(info, [project.language or "en", "en"])
    reference = Reference(
        project_id=project.id,
        source_url=info.url or url,
        title=info.title[:500],
        media_type=MediaType.VIDEO,
        status=ReferenceStatus.PENDING,
        reference_metadata={},
    )
    _apply(reference, info, transcript)
    db.add(reference)
    await db.commit()
    await db.refresh(reference)
    return reference


async def refresh_reference(db: AsyncSession, reference: Reference, language: str = "en") -> Reference:
    if not reference.source_url:
        raise ValueError("This reference has no source URL to refresh from")
    info = await video_details(reference.source_url)
    transcript = await fetch_transcript(info, [language, "en"])
    _apply(reference, info, transcript)
    await db.commit()
    await db.refresh(reference)
    return reference
