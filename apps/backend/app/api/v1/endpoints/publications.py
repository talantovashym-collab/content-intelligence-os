from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.publication import Publication, PublishStatus, Platform
from app.models.production import Production
from app.models.project import Project
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.services import media
from pydantic import BaseModel, model_validator
from datetime import datetime

router = APIRouter()


class PublicationBase(BaseModel):
    production_id: uuid.UUID
    platform: Platform
    account_id: str
    title: str
    description: str
    tags: List[str] = []
    hashtags: List[str] = []
    cover_image_url: Optional[str] = None
    video_url: str
    scheduled_at: Optional[datetime] = None


class PublicationCreate(PublicationBase):
    pass


class PublicationUpdate(BaseModel):
    production_id: Optional[uuid.UUID] = None
    platform: Optional[Platform] = None
    account_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    hashtags: Optional[List[str]] = None
    cover_image_url: Optional[str] = None
    video_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    status: Optional[PublishStatus] = None
    platform_post_id: Optional[str] = None
    platform_url: Optional[str] = None
    error_message: Optional[str] = None
    publication_metadata: Optional[dict] = None


class PublicationResponse(PublicationBase):
    id: uuid.UUID
    project_id: uuid.UUID
    status: PublishStatus
    platform_post_id: Optional[str]
    platform_url: Optional[str]
    published_at: Optional[datetime]
    error_message: Optional[str]
    publication_metadata: dict
    created_at: datetime
    updated_at: datetime
    # Signed, expiring links for the uploaded finished cut (relative to the API root)
    playback_url: Optional[str] = None
    poster_url: Optional[str] = None

    @model_validator(mode="after")
    def _media_urls(self):
        video = (self.publication_metadata or {}).get("video_file") or {}
        if video.get("path"):
            self.playback_url = media.signed_url("publications", self.id, "file")
            if video.get("poster_path"):
                self.poster_url = media.signed_url("publications", self.id, "poster")
        return self

    class Config:
        from_attributes = True


class PublicationListResponse(BaseModel):
    publications: List[PublicationResponse]
    total: int
    page: int
    page_size: int


@router.post("/{project_id}/publications", response_model=PublicationResponse, status_code=status.HTTP_201_CREATED)
async def create_publication(
    project_id: uuid.UUID,
    publication_data: PublicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Production).where(
            Production.id == publication_data.production_id,
            Production.project_id == project_id
        )
    )
    production = result.scalar_one_or_none()
    if not production:
        raise HTTPException(status_code=404, detail="Production not found in this project")

    publication = Publication(
        project_id=project_id,
        **publication_data.model_dump(),
    )
    db.add(publication)
    await db.commit()
    await db.refresh(publication)
    return publication


@router.get("/{project_id}/publications", response_model=PublicationListResponse)
async def list_publications(
    project_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[PublishStatus] = None,
    platform: Optional[Platform] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = select(Publication).where(Publication.project_id == project_id)
    if status:
        query = query.where(Publication.status == status)
    if platform:
        query = query.where(Publication.platform == platform)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    query = query.order_by(Publication.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    publications = result.scalars().all()

    return PublicationListResponse(
        publications=publications,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}/publications/{publication_id}", response_model=PublicationResponse)
async def get_publication(
    project_id: uuid.UUID,
    publication_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Publication)
        .join(Project, Project.id == Publication.project_id)
        .where(Publication.id == publication_id, Publication.project_id == project_id, Project.user_id == current_user.id)
    )
    publication = result.scalar_one_or_none()
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    return publication


@router.patch("/{project_id}/publications/{publication_id}", response_model=PublicationResponse)
async def update_publication(
    project_id: uuid.UUID,
    publication_id: uuid.UUID,
    publication_data: PublicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Publication)
        .join(Project, Project.id == Publication.project_id)
        .where(Publication.id == publication_id, Publication.project_id == project_id, Project.user_id == current_user.id)
    )
    publication = result.scalar_one_or_none()
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")

    update_data = publication_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(publication, field, value)

    await db.commit()
    await db.refresh(publication)
    return publication


@router.delete("/{project_id}/publications/{publication_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_publication(
    project_id: uuid.UUID,
    publication_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Publication)
        .join(Project, Project.id == Publication.project_id)
        .where(Publication.id == publication_id, Publication.project_id == project_id,
               Project.user_id == current_user.id)
    )
    publication = result.scalar_one_or_none()
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")

    video = (publication.publication_metadata or {}).get("video_file") or {}
    await db.delete(publication)
    await db.commit()
    media.remove(video.get("path"), video.get("poster_path"))