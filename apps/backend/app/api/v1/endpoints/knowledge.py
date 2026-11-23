from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.knowledge import KnowledgeEntry
from app.models.project import Project
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class KnowledgeEntryBase(BaseModel):
    category: str
    title: str
    content: dict = {}
    evidence: dict = {}
    source_type: str
    source_reference: Optional[str] = None
    confidence_level: float
    tags: List[str] = []


class KnowledgeEntryCreate(KnowledgeEntryBase):
    pass


class KnowledgeEntryUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    content: Optional[dict] = None
    evidence: Optional[dict] = None
    source_type: Optional[str] = None
    source_reference: Optional[str] = None
    confidence_level: Optional[float] = None
    is_validated: Optional[bool] = None
    tags: Optional[List[str]] = None


class KnowledgeEntryResponse(KnowledgeEntryBase):
    id: uuid.UUID
    project_id: uuid.UUID
    is_validated: bool
    validated_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KnowledgeEntryListResponse(BaseModel):
    entries: List[KnowledgeEntryResponse]
    total: int
    page: int
    page_size: int


@router.post("/{project_id}/knowledge", response_model=KnowledgeEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_entry(
    project_id: uuid.UUID,
    entry_data: KnowledgeEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    entry = KnowledgeEntry(
        project_id=project_id,
        **entry_data.model_dump(),
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/{project_id}/knowledge", response_model=KnowledgeEntryListResponse)
async def list_knowledge_entries(
    project_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    is_validated: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = select(KnowledgeEntry).where(KnowledgeEntry.project_id == project_id)
    if category:
        query = query.where(KnowledgeEntry.category == category)
    if is_validated is not None:
        query = query.where(KnowledgeEntry.is_validated == is_validated)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    query = query.order_by(KnowledgeEntry.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    entries = result.scalars().all()

    return KnowledgeEntryListResponse(
        entries=entries,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}/knowledge/{entry_id}", response_model=KnowledgeEntryResponse)
async def get_knowledge_entry(
    project_id: uuid.UUID,
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeEntry)
        .where(KnowledgeEntry.id == entry_id, KnowledgeEntry.project_id == project_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")
    return entry


@router.patch("/{project_id}/knowledge/{entry_id}", response_model=KnowledgeEntryResponse)
async def update_knowledge_entry(
    project_id: uuid.UUID,
    entry_id: uuid.UUID,
    entry_data: KnowledgeEntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeEntry)
        .where(KnowledgeEntry.id == entry_id, KnowledgeEntry.project_id == project_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")

    update_data = entry_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{project_id}/knowledge/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_entry(
    project_id: uuid.UUID,
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeEntry)
        .where(KnowledgeEntry.id == entry_id, KnowledgeEntry.project_id == project_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")

    await db.delete(entry)
    await db.commit()