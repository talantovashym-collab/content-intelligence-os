"""Videos for the Production module. Mounted under /projects.

A production's video is either a finished cut the user uploads (made in their own editor)
or a draft the app renders locally from the storyboard. Finished cuts attached to the
production's publications are listed too, so every watchable video of a production shows
up in one place.
"""

import uuid
from datetime import datetime
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.api.v1.ownership import owned_item, owned_project
from app.db.session import get_db
from app.models.production import Production
from app.models.publication import Publication
from app.models.strategy import CreativeStrategy
from app.models.user import User
from app.services import media, render, uploads

router = APIRouter()


class ProductionVideo(BaseModel):
    kind: Literal["production", "publication"]
    id: uuid.UUID  # the production's or the publication's id
    production_id: uuid.UUID
    title: str
    source: Literal["upload", "render", "publication"]
    platform: Optional[str] = None
    playback_url: str  # signed, expiring, relative to the API root
    poster_url: Optional[str] = None
    filename: Optional[str] = None
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    created_at: Optional[datetime] = None


def _production_video(production: Production, title: str) -> Optional[ProductionVideo]:
    video = (production.media or {}).get("video_file") or {}
    if not video.get("path"):
        return None
    return ProductionVideo(
        kind="production", id=production.id, production_id=production.id, title=title,
        source=video.get("source") if video.get("source") in ("upload", "render") else "upload",
        playback_url=media.signed_url("productions", production.id, "file"),
        poster_url=media.signed_url("productions", production.id, "poster") if video.get("poster_path") else None,
        filename=video.get("filename"), duration=video.get("duration"),
        width=video.get("width"), height=video.get("height"), created_at=video.get("uploaded_at"),
    )


def _publication_video(publication: Publication) -> Optional[ProductionVideo]:
    video = (publication.publication_metadata or {}).get("video_file") or {}
    if not video.get("path"):
        return None
    return ProductionVideo(
        kind="publication", id=publication.id, production_id=publication.production_id, title=publication.title,
        source="publication", platform=publication.platform.value,
        playback_url=media.signed_url("publications", publication.id, "file"),
        poster_url=media.signed_url("publications", publication.id, "poster") if video.get("poster_path") else None,
        filename=video.get("filename"), duration=video.get("duration"),
        width=video.get("width"), height=video.get("height"), created_at=video.get("uploaded_at"),
    )


async def _topic(db: AsyncSession, production: Production) -> str:
    return await db.scalar(select(CreativeStrategy.topic).where(CreativeStrategy.id == production.strategy_id)) or "Production"


def _media_error(e: media.MediaError) -> HTTPException:
    code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE if isinstance(e, media.MediaTooLarge) else 422
    return HTTPException(status_code=code, detail=str(e))


@router.get("/{project_id}/production-videos", response_model=List[ProductionVideo])
async def list_production_videos(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Every watchable video in the project: production videos first, then publications' finished cuts."""
    await owned_project(db, project_id, current_user)
    rows = await db.execute(
        select(Production, CreativeStrategy.topic)
        .join(CreativeStrategy, CreativeStrategy.id == Production.strategy_id)
        .where(Production.project_id == project_id, Production.media.has_key("video_file"))
        .order_by(Production.updated_at.desc())
    )
    videos = [v for p, topic in rows.all() if (v := _production_video(p, topic))]
    publications = await db.scalars(
        select(Publication)
        .where(Publication.project_id == project_id, Publication.publication_metadata.has_key("video_file"))
        .order_by(Publication.updated_at.desc())
    )
    videos += [v for p in publications if (v := _publication_video(p))]
    return videos


@router.post("/{project_id}/productions/{production_id}/video", response_model=ProductionVideo)
async def upload_production_video(
    project_id: uuid.UUID,
    production_id: uuid.UUID,
    file: UploadFile = File(..., description="The finished video"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attach a finished cut to the production so it plays in the Production module (replaces any earlier one)."""
    production = await owned_item(db, Production, production_id, project_id, current_user, "Production")
    try:
        production = await uploads.attach_production_video(db, production, file)
    except media.MediaError as e:
        raise _media_error(e)
    finally:
        await file.close()
    return _production_video(production, await _topic(db, production))


class RenderRequest(BaseModel):
    aspect: Literal["16:9", "9:16"] = "16:9"


@router.post("/{project_id}/productions/{production_id}/render", response_model=ProductionVideo)
async def render_production_video(
    project_id: uuid.UUID,
    production_id: uuid.UUID,
    body: RenderRequest = RenderRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Render a draft video from the storyboard, locally with ffmpeg (no API keys), and make it the production's video.

    Replaces any earlier video of the production, including an uploaded finished cut.
    """
    production = await owned_item(db, Production, production_id, project_id, current_user, "Production")
    strategy = await db.get(CreativeStrategy, production.strategy_id)
    topic = (strategy.topic if strategy else None) or "Production"
    try:
        stored = await render.render_production(production, topic, strategy.duration if strategy else None, body.aspect)
    except media.MediaError as e:
        raise _media_error(e)
    production = await uploads.set_production_video(db, production, stored, "render")
    return _production_video(production, topic)


@router.delete("/{project_id}/productions/{production_id}/video", status_code=status.HTTP_204_NO_CONTENT)
async def delete_production_video(
    project_id: uuid.UUID,
    production_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove the production's video (the file is deleted)."""
    production = await owned_item(db, Production, production_id, project_id, current_user, "Production")
    await uploads.detach_production_video(db, production)
