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
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class ProductionBase(BaseModel):
    strategy_id: uuid.UUID
    format: CreativeFormat
    script: dict = {}
    hooks: dict = {}
    voiceover: dict = {}
    storyboard: dict = {}
    character_designs: dict = {}
    animation_instructions: dict = {}
    visual_prompts: dict = {}
    image_assets: dict = {}
    video_assets: dict = {}
    sound_design: dict = {}
    music_direction: dict = {}
    editing_instructions: dict = {}
    captions: dict = {}
    subtitles: dict = {}
    timeline: dict = {}


class ProductionCreate(ProductionBase):
    pass


class ProductionUpdate(BaseModel):
    strategy_id: Optional[uuid.UUID] = None
    format: Optional[CreativeFormat] = None
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


class ProductionResponse(ProductionBase):
    id: uuid.UUID
    project_id: uuid.UUID
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


@router.post("/{project_id}/productions", response_model=ProductionResponse, status_code=status.HTTP_201_CREATED)
async def create_production(
    project_id: uuid.UUID,
    production_data: ProductionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify strategy belongs to project
    result = await db.execute(
        select(CreativeStrategy).where(
            CreativeStrategy.id == production_data.strategy_id,
            CreativeStrategy.project_id == project_id
        )
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found in this project")

    production = Production(
        project_id=project_id,
        **production_data.model_dump(),
    )
    db.add(production)
    await db.commit()
    await db.refresh(production)
    return production


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
        productions=productions,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}/productions/{production_id}", response_model=ProductionResponse)
async def get_production(
    project_id: uuid.UUID,
    production_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Production)
        .where(Production.id == production_id, Production.project_id == project_id)
    )
    production = result.scalar_one_or_none()
    if not production:
        raise HTTPException(status_code=404, detail="Production not found")
    return production


@router.patch("/{project_id}/productions/{production_id}", response_model=ProductionResponse)
async def update_production(
    project_id: uuid.UUID,
    production_id: uuid.UUID,
    production_data: ProductionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Production)
        .where(Production.id == production_id, Production.project_id == project_id)
    )
    production = result.scalar_one_or_none()
    if not production:
        raise HTTPException(status_code=404, detail="Production not found")

    update_data = production_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(production, field, value)

    await db.commit()
    await db.refresh(production)
    return production


@router.delete("/{project_id}/productions/{production_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_production(
    project_id: uuid.UUID,
    production_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Production)
        .where(Production.id == production_id, Production.project_id == project_id)
    )
    production = result.scalar_one_or_none()
    if not production:
        raise HTTPException(status_code=404, detail="Production not found")

    await db.delete(production)
    await db.commit()