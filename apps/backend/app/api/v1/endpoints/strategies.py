from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.strategy import CreativeStrategy
from app.models.project import Project
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class CreativeStrategyBase(BaseModel):
    concept: str
    topic: str
    target_audience: str
    creative_angle: str
    core_message: str
    emotional_objective: str
    hook_direction: str
    narrative_formula: str
    visual_style: str
    animation_style: str
    duration: int
    platform_adaptations: dict = {}
    differentiation: str
    alternatives: dict = {}


class CreativeStrategyCreate(CreativeStrategyBase):
    pass


class CreativeStrategyUpdate(BaseModel):
    concept: Optional[str] = None
    topic: Optional[str] = None
    target_audience: Optional[str] = None
    creative_angle: Optional[str] = None
    core_message: Optional[str] = None
    emotional_objective: Optional[str] = None
    hook_direction: Optional[str] = None
    narrative_formula: Optional[str] = None
    visual_style: Optional[str] = None
    animation_style: Optional[str] = None
    duration: Optional[int] = None
    platform_adaptations: Optional[dict] = None
    differentiation: Optional[str] = None
    alternatives: Optional[dict] = None
    is_approved: Optional[bool] = None


class CreativeStrategyResponse(CreativeStrategyBase):
    id: uuid.UUID
    project_id: uuid.UUID
    is_approved: bool
    approved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreativeStrategyListResponse(BaseModel):
    strategies: List[CreativeStrategyResponse]
    total: int
    page: int
    page_size: int


@router.post("/{project_id}/strategies", response_model=CreativeStrategyResponse, status_code=status.HTTP_201_CREATED)
async def create_strategy(
    project_id: uuid.UUID,
    strategy_data: CreativeStrategyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    strategy = CreativeStrategy(
        project_id=project_id,
        **strategy_data.model_dump(),
    )
    db.add(strategy)
    await db.commit()
    await db.refresh(strategy)
    return strategy


@router.get("/{project_id}/strategies", response_model=CreativeStrategyListResponse)
async def list_strategies(
    project_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = select(CreativeStrategy).where(CreativeStrategy.project_id == project_id)
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    query = query.order_by(CreativeStrategy.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    strategies = result.scalars().all()

    return CreativeStrategyListResponse(
        strategies=strategies,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}/strategies/{strategy_id}", response_model=CreativeStrategyResponse)
async def get_strategy(
    project_id: uuid.UUID,
    strategy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CreativeStrategy)
        .where(CreativeStrategy.id == strategy_id, CreativeStrategy.project_id == project_id)
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy


@router.patch("/{project_id}/strategies/{strategy_id}", response_model=CreativeStrategyResponse)
async def update_strategy(
    project_id: uuid.UUID,
    strategy_id: uuid.UUID,
    strategy_data: CreativeStrategyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CreativeStrategy)
        .where(CreativeStrategy.id == strategy_id, CreativeStrategy.project_id == project_id)
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    update_data = strategy_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(strategy, field, value)

    await db.commit()
    await db.refresh(strategy)
    return strategy


@router.delete("/{project_id}/strategies/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_strategy(
    project_id: uuid.UUID,
    strategy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CreativeStrategy)
        .where(CreativeStrategy.id == strategy_id, CreativeStrategy.project_id == project_id)
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    await db.delete(strategy)
    await db.commit()