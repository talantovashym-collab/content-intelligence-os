from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.analytics import Analytics, Platform
from app.models.publication import Publication
from app.models.project import Project
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class AnalyticsBase(BaseModel):
    publication_id: uuid.UUID
    platform: Platform
    views: int = 0
    watch_time: int = 0
    retention: dict = {}
    completion_rate: float = 0.0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    saves: int = 0
    follower_growth: int = 0
    engagement_rate: float = 0.0
    performance_over_time: dict = {}
    predicted_vs_actual: dict = {}
    successful_elements: dict = {}
    weak_points: dict = {}
    improvement_opps: dict = {}
    cross_platform_compare: dict = {}


class AnalyticsCreate(AnalyticsBase):
    pass


class AnalyticsUpdate(BaseModel):
    publication_id: Optional[uuid.UUID] = None
    platform: Optional[Platform] = None
    views: Optional[int] = None
    watch_time: Optional[int] = None
    retention: Optional[dict] = None
    completion_rate: Optional[float] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None
    saves: Optional[int] = None
    follower_growth: Optional[int] = None
    engagement_rate: Optional[float] = None
    performance_over_time: Optional[dict] = None
    predicted_vs_actual: Optional[dict] = None
    successful_elements: Optional[dict] = None
    weak_points: Optional[dict] = None
    improvement_opps: Optional[dict] = None
    cross_platform_compare: Optional[dict] = None


class AnalyticsResponse(AnalyticsBase):
    id: uuid.UUID
    project_id: uuid.UUID
    collected_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnalyticsListResponse(BaseModel):
    analytics: List[AnalyticsResponse]
    total: int
    page: int
    page_size: int


@router.post("/{project_id}/analytics", response_model=AnalyticsResponse, status_code=status.HTTP_201_CREATED)
async def create_analytics(
    project_id: uuid.UUID,
    analytics_data: AnalyticsCreate,
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
        select(Publication).where(
            Publication.id == analytics_data.publication_id,
            Publication.project_id == project_id
        )
    )
    publication = result.scalar_one_or_none()
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found in this project")

    analytics = Analytics(
        project_id=project_id,
        **analytics_data.model_dump(),
    )
    db.add(analytics)
    await db.commit()
    await db.refresh(analytics)
    return analytics


@router.get("/{project_id}/analytics", response_model=AnalyticsListResponse)
async def list_analytics(
    project_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
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

    query = select(Analytics).where(Analytics.project_id == project_id)
    if platform:
        query = query.where(Analytics.platform == platform)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    query = query.order_by(Analytics.collected_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    analytics = result.scalars().all()

    return AnalyticsListResponse(
        analytics=analytics,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}/analytics/{analytics_id}", response_model=AnalyticsResponse)
async def get_analytics(
    project_id: uuid.UUID,
    analytics_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Analytics)
        .where(Analytics.id == analytics_id, Analytics.project_id == project_id)
    )
    analytics = result.scalar_one_or_none()
    if not analytics:
        raise HTTPException(status_code=404, detail="Analytics not found")
    return analytics


@router.patch("/{project_id}/analytics/{analytics_id}", response_model=AnalyticsResponse)
async def update_analytics(
    project_id: uuid.UUID,
    analytics_id: uuid.UUID,
    analytics_data: AnalyticsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Analytics)
        .where(Analytics.id == analytics_id, Analytics.project_id == project_id)
    )
    analytics = result.scalar_one_or_none()
    if not analytics:
        raise HTTPException(status_code=404, detail="Analytics not found")

    update_data = analytics_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(analytics, field, value)

    await db.commit()
    await db.refresh(analytics)
    return analytics


@router.delete("/{project_id}/analytics/{analytics_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analytics(
    project_id: uuid.UUID,
    analytics_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Analytics)
        .where(Analytics.id == analytics_id, Analytics.project_id == project_id)
    )
    analytics = result.scalar_one_or_none()
    if not analytics:
        raise HTTPException(status_code=404, detail="Analytics not found")

    await db.delete(analytics)
    await db.commit()