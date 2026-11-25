from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.production import Production, CreativeFormat
from app.models.strategy import CreativeStrategy
from app.models.project import Project
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.services.production_studio.service import ProductionStudioService
from app.services.production_studio.schemas import (
    ProductionGenerationRequest,
    ProductionAssetRequest,
)
from pydantic import BaseModel, Field
from datetime import datetime

router = APIRouter()


class ProductionGenerateRequest(BaseModel):
    strategy_id: uuid.UUID
    format: CreativeFormat
    platform_targets: List[str] = Field(default_factory=lambda: ["youtube", "tiktok", "instagram"])
    custom_requirements: Optional[dict] = None


class ProductionResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    strategy_id: uuid.UUID
    format: CreativeFormat
    script: dict
    hooks: dict
    voiceover: dict
    storyboard: dict
    character_designs: dict
    animation_instructions: dict
    visual_prompts: dict
    image_assets: dict
    video_assets: dict
    sound_design: dict
    music_direction: dict
    editing_instructions: dict
    captions: dict
    subtitles: dict
    timeline: dict
    version: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductionListResponse(BaseModel):
    productions: List[ProductionResponse]
    total: int
    page: int
    page_size: int


class ProductionUpdate(BaseModel):
    script: Optional[dict] = None
    hooks: Optional[dict] = None
    voiceover: Optional[dict] = None
    storyboard: Optional[dict] = None
    character_designs: Optional[dict] = None
    animation_instructions: Optional[dict] = None
    visual_prompts: Optional[dict] = None
    image_assets: Optional[dict] = None
    video_assets: Optional[dict] = None
    sound_design: Optional[dict] = None
    music_direction: Optional[dict] = None
    editing_instructions: Optional[dict] = None
    captions: Optional[dict] = None
    subtitles: Optional[dict] = None
    timeline: Optional[dict] = None
    version: Optional[int] = None
    status: Optional[str] = None


class ProductionQueueItemResponse(BaseModel):
    production_id: uuid.UUID
    project_id: uuid.UUID
    format: str
    status: str
    priority: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class ProductionExportRequest(BaseModel):
    export_format: str = "json"
    include_assets: bool = True


class ProductionAssetGenerateRequest(BaseModel):
    asset_type: str
    parameters: Optional[dict] = None


async def _get_owned_production(
    db: AsyncSession, project_id: uuid.UUID, production_id: uuid.UUID, user: User
) -> Production:
    """Fetch a production that belongs to project_id AND a project owned by user."""
    result = await db.execute(
        select(Production)
        .join(Project, Production.project_id == Project.id)
        .where(
            Production.id == production_id,
            Production.project_id == project_id,
            Project.user_id == user.id,
        )
    )
    production = result.scalar_one_or_none()
    if not production:
        raise HTTPException(status_code=404, detail="Production not found")
    return production



@router.post("/{project_id}/productions/generate", response_model=ProductionResponse, status_code=status.HTTP_201_CREATED)
async def generate_production(
    project_id: uuid.UUID,
    production_data: ProductionGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a complete production package from an approved creative strategy."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify strategy belongs to project and is approved
    result = await db.execute(
        select(CreativeStrategy).where(
            CreativeStrategy.id == production_data.strategy_id,
            CreativeStrategy.project_id == project_id
        )
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found in this project")
    if not strategy.is_approved:
        raise HTTPException(status_code=400, detail="Strategy must be approved before generating production")

    # Generate production using service
    service = ProductionStudioService(db)
    request = ProductionGenerationRequest(
        strategy_id=production_data.strategy_id,
        format=production_data.format.value,
        platform_targets=production_data.platform_targets,
        custom_requirements=production_data.custom_requirements,
    )

    generated = await service.generate_production(request)
    production = await db.get(Production, generated.production_id)
    return ProductionResponse.model_validate(production)


@router.get("/{project_id}/productions", response_model=ProductionListResponse)
async def list_productions(
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

    query = select(Production).where(Production.project_id == project_id)
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    query = query.order_by(Production.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    productions = result.scalars().all()

    return ProductionListResponse(
        productions=[ProductionResponse.model_validate(p) for p in productions],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}/productions/queue", response_model=List[ProductionQueueItemResponse])
async def get_production_queue(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = ProductionStudioService(db)
    queue = await service.get_production_queue(project_id)
    return queue


@router.get("/{project_id}/productions/{production_id}", response_model=ProductionResponse)
async def get_production(
    project_id: uuid.UUID,
    production_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    production = await _get_owned_production(db, project_id, production_id, current_user)
    return ProductionResponse.model_validate(production)


@router.patch("/{project_id}/productions/{production_id}", response_model=ProductionResponse)
async def update_production(
    project_id: uuid.UUID,
    production_id: uuid.UUID,
    production_data: ProductionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    production = await _get_owned_production(db, project_id, production_id, current_user)

    update_data = production_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(production, field, value)

    await db.commit()
    await db.refresh(production)
    return ProductionResponse.model_validate(production)


@router.patch("/{project_id}/productions/{production_id}/status", response_model=ProductionResponse)
async def update_production_status(
    project_id: uuid.UUID,
    production_id: uuid.UUID,
    new_status: str = Query(..., alias="status", min_length=1, max_length=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    production = await _get_owned_production(db, project_id, production_id, current_user)

    service = ProductionStudioService(db)
    updated = await service.update_production_status(production.id, new_status)
    return ProductionResponse.model_validate(updated)


@router.post("/{project_id}/productions/{production_id}/assets")
async def generate_asset(
    project_id: uuid.UUID,
    production_id: uuid.UUID,
    asset_data: ProductionAssetGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    production = await _get_owned_production(db, project_id, production_id, current_user)

    service = ProductionStudioService(db)
    request = ProductionAssetRequest(
        production_id=production_id,
        asset_type=asset_data.asset_type,
        parameters=asset_data.parameters,
    )
    response = await service.generate_asset(request)
    return response


@router.post("/{project_id}/productions/{production_id}/export")
async def export_production(
    project_id: uuid.UUID,
    production_id: uuid.UUID,
    export_data: ProductionExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    production = await _get_owned_production(db, project_id, production_id, current_user)

    service = ProductionStudioService(db)
    response = await service.export_production(
        production_id=production_id,
        export_format=export_data.export_format,
        include_assets=export_data.include_assets,
    )
    return response


@router.delete("/{project_id}/productions/{production_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_production(
    project_id: uuid.UUID,
    production_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    production = await _get_owned_production(db, project_id, production_id, current_user)

    await db.delete(production)
    await db.commit()