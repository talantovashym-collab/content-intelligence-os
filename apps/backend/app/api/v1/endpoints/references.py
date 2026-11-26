from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.reference import Reference, ReferenceStatus, MediaType, Platform
from app.models.project import Project
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.services import media
from pydantic import BaseModel, model_validator
from datetime import datetime

router = APIRouter()


class ReferenceBase(BaseModel):
    source_url: Optional[str] = None
    source_platform: Optional[Platform] = None
    creator_id: Optional[str] = None
    creator_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    media_type: MediaType
    media_url: Optional[str] = None
    local_path: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    published_at: Optional[datetime] = None
    engagement_metrics: dict = {}
    hashtags: List[str] = []
    captions: Optional[str] = None


class ReferenceCreate(ReferenceBase):
    pass


class ReferenceUpdate(BaseModel):
    source_url: Optional[str] = None
    source_platform: Optional[Platform] = None
    creator_id: Optional[str] = None
    creator_name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    media_type: Optional[MediaType] = None
    media_url: Optional[str] = None
    local_path: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    published_at: Optional[datetime] = None
    engagement_metrics: Optional[dict] = None
    hashtags: Optional[List[str]] = None
    captions: Optional[str] = None
    status: Optional[ReferenceStatus] = None
    reference_metadata: Optional[dict] = None
    error_message: Optional[str] = None


class ReferenceResponse(ReferenceBase):
    id: uuid.UUID
    project_id: uuid.UUID
    status: ReferenceStatus
    reference_metadata: dict
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Signed, expiring links for uploaded files (relative to the API root)
    playback_url: Optional[str] = None
    poster_url: Optional[str] = None

    @model_validator(mode="after")
    def _media_urls(self):
        if self.local_path:
            self.playback_url = media.signed_url("references", self.id, "file")
            if (self.reference_metadata or {}).get("thumbnail_path"):
                self.poster_url = media.signed_url("references", self.id, "poster")
        return self

    class Config:
        from_attributes = True


class ReferenceListResponse(BaseModel):
    references: List[ReferenceResponse]
    total: int
    page: int
    page_size: int


@router.post("/{project_id}/references", response_model=ReferenceResponse, status_code=status.HTTP_201_CREATED)
async def create_reference(
    project_id: uuid.UUID,
    reference_data: ReferenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    reference = Reference(
        project_id=project_id,
        **reference_data.model_dump(),
    )
    db.add(reference)
    await db.commit()
    await db.refresh(reference)
    return reference


@router.get("/{project_id}/references", response_model=ReferenceListResponse)
async def list_references(
    project_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[ReferenceStatus] = None,
    media_type: Optional[MediaType] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = select(Reference).where(Reference.project_id == project_id)
    if status:
        query = query.where(Reference.status == status)
    if media_type:
        query = query.where(Reference.media_type == media_type)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    query = query.order_by(Reference.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    references = result.scalars().all()

    return ReferenceListResponse(
        references=references,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}/references/{reference_id}", response_model=ReferenceResponse)
async def get_reference(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Reference)
        .join(Project, Project.id == Reference.project_id)
        .where(Reference.id == reference_id, Reference.project_id == project_id, Project.user_id == current_user.id)
    )
    reference = result.scalar_one_or_none()
    if not reference:
        raise HTTPException(status_code=404, detail="Reference not found")
    return reference


@router.patch("/{project_id}/references/{reference_id}", response_model=ReferenceResponse)
async def update_reference(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    reference_data: ReferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Reference)
        .join(Project, Project.id == Reference.project_id)
        .where(Reference.id == reference_id, Reference.project_id == project_id, Project.user_id == current_user.id)
    )
    reference = result.scalar_one_or_none()
    if not reference:
        raise HTTPException(status_code=404, detail="Reference not found")

    update_data = reference_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reference, field, value)

    await db.commit()
    await db.refresh(reference)
    return reference


@router.delete("/{project_id}/references/{reference_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reference(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Reference)
        .join(Project, Project.id == Reference.project_id)
        .where(Reference.id == reference_id, Reference.project_id == project_id,
               Project.user_id == current_user.id)
    )
    reference = result.scalar_one_or_none()
    if not reference:
        raise HTTPException(status_code=404, detail="Reference not found")

    files = (reference.local_path, (reference.reference_metadata or {}).get("thumbnail_path"))
    await db.delete(reference)
    await db.commit()
    media.remove(*files)