"""Playback for uploaded media. No bearer token here (a <video> tag cannot send one):
each URL carries an expiring HMAC signature for one item, issued in API responses
to the owner (see app/services/media.py)."""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.production import Production
from app.models.publication import Publication
from app.models.reference import Reference
from app.services import media

router = APIRouter()


def _serve(rel, request: Request, content_type: str):
    if not rel:
        raise HTTPException(status_code=404, detail="No media for this item")
    try:
        path = media.abs_path(rel)
    except media.MediaError:
        raise HTTPException(status_code=404, detail="No media for this item")
    return media.stream_file(path, request, content_type)


@router.get("/references/{reference_id}/{variant}")
async def reference_media(
    reference_id: uuid.UUID,
    variant: Literal["file", "poster"],
    request: Request,
    expires: int = Query(...),
    sig: str = Query(..., max_length=64),
    db: AsyncSession = Depends(get_db),
):
    media.check_signature("references", reference_id, variant, expires, sig)
    reference = await db.get(Reference, reference_id)
    if reference is None:
        raise HTTPException(status_code=404, detail="Reference not found")
    meta = reference.reference_metadata or {}
    if variant == "poster":
        return _serve(meta.get("thumbnail_path"), request, "image/jpeg")
    return _serve(reference.local_path, request, (meta.get("upload") or {}).get("content_type") or "application/octet-stream")


@router.get("/publications/{publication_id}/{variant}")
async def publication_media(
    publication_id: uuid.UUID,
    variant: Literal["file", "poster"],
    request: Request,
    expires: int = Query(...),
    sig: str = Query(..., max_length=64),
    db: AsyncSession = Depends(get_db),
):
    media.check_signature("publications", publication_id, variant, expires, sig)
    publication = await db.get(Publication, publication_id)
    if publication is None:
        raise HTTPException(status_code=404, detail="Publication not found")
    video = (publication.publication_metadata or {}).get("video_file") or {}
    if variant == "poster":
        return _serve(video.get("poster_path"), request, "image/jpeg")
    return _serve(video.get("path"), request, video.get("content_type") or "video/mp4")


@router.get("/productions/{production_id}/{variant}")
async def production_media(
    production_id: uuid.UUID,
    variant: Literal["file", "poster"],
    request: Request,
    expires: int = Query(...),
    sig: str = Query(..., max_length=64),
    db: AsyncSession = Depends(get_db),
):
    media.check_signature("productions", production_id, variant, expires, sig)
    production = await db.get(Production, production_id)
    if production is None:
        raise HTTPException(status_code=404, detail="Production not found")
    video = (production.media or {}).get("video_file") or {}
    if variant == "poster":
        return _serve(video.get("poster_path"), request, "image/jpeg")
    return _serve(video.get("path"), request, video.get("content_type") or "video/mp4")
