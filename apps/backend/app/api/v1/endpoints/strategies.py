from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.strategy import CreativeStrategy
from app.models.project import Project
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.services.creative_strategy.service import CreativeStrategyService
from app.services.creative_strategy.schemas import CreativeStrategyGenerationRequest
from pydantic import AliasChoices, BaseModel, Field
from datetime import datetime

router = APIRouter()


class StrategyGenerationRequestAPI(BaseModel):
    concept: str = Field(..., min_length=10, max_length=5000)
    topic: str = Field(..., min_length=3, max_length=200)
    target_audience: str = Field(..., min_length=10, max_length=2000)
    research_context: Optional[dict] = None
    reference_dna: Optional[dict] = None
    platform_targets: List[str] = Field(default_factory=lambda: ["youtube", "tiktok", "instagram"])
    duration_preference: int = Field(60, ge=5, le=3600)
    tone: str = "engaging"
    format_preference: str = "educational"


class StrategyGenerationResponseAPI(BaseModel):
    strategy_id: uuid.UUID = Field(validation_alias=AliasChoices("strategy_id", "id"))
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
    platform_adaptations: dict
    differentiation: str
    alternatives: dict
    is_approved: bool
    approved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StrategyListResponse(BaseModel):
    strategies: List[StrategyGenerationResponseAPI]
    total: int
    page: int
    page_size: int


class StrategyApprovalRequestAPI(BaseModel):
    approved: bool
    feedback: Optional[str] = None


@router.post("/{project_id}/strategies", response_model=StrategyGenerationResponseAPI, status_code=status.HTTP_201_CREATED)
async def create_strategy(
    project_id: uuid.UUID,
    strategy_data: StrategyGenerationRequestAPI,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify project ownership
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Create service and generate strategy
    service = CreativeStrategyService(db)
    request = CreativeStrategyGenerationRequest(
        project_id=project_id,
        **strategy_data.model_dump(),
    )

    response = await service.generate_strategy(request)
    return response


@router.get("/{project_id}/strategies", response_model=StrategyListResponse)
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

    service = CreativeStrategyService(db)
    strategies = await service.list_strategies(project_id)

    # Paginate manually
    total = len(strategies)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = strategies[start:end]

    return StrategyListResponse(
        strategies=[StrategyGenerationResponseAPI.model_validate(s) for s in paginated],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}/strategies/{strategy_id}", response_model=StrategyGenerationResponseAPI)
async def get_strategy(
    project_id: uuid.UUID,
    strategy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = CreativeStrategyService(db)
    strategy = await service.get_strategy(strategy_id)
    if not strategy or strategy.project_id != project_id:
        raise HTTPException(status_code=404, detail="Strategy not found")

    return StrategyGenerationResponseAPI.model_validate(strategy)


@router.patch("/{project_id}/strategies/{strategy_id}/approve", response_model=StrategyGenerationResponseAPI)
async def approve_strategy(
    project_id: uuid.UUID,
    strategy_id: uuid.UUID,
    approval_data: StrategyApprovalRequestAPI,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = CreativeStrategyService(db)
    existing = await service.get_strategy(strategy_id)
    if not existing or existing.project_id != project_id:
        raise HTTPException(status_code=404, detail="Strategy not found")

    strategy = await service.approve_strategy(strategy_id, approval_data.approved, approval_data.feedback)
    return StrategyGenerationResponseAPI.model_validate(strategy)


@router.delete("/{project_id}/strategies/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_strategy(
    project_id: uuid.UUID,
    strategy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CreativeStrategy)
        .join(Project, CreativeStrategy.project_id == Project.id)
        .where(
            CreativeStrategy.id == strategy_id,
            CreativeStrategy.project_id == project_id,
            Project.user_id == current_user.id,
        )
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    await db.delete(strategy)
    await db.commit()
