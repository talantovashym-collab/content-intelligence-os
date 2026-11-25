from typing import Any, Dict, List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.opportunity import Opportunity, OpportunityStatus, CreativeFormat
from app.models.project import Project
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# JSONB columns: discovery stores objects, older rows may hold lists
JSONValue = Union[Dict[str, Any], List[Any]]


class OpportunityBase(BaseModel):
    title: str
    topic_description: str
    target_audience: str
    audience_need: str
    market_evidence: JSONValue = {}
    relevant_trends: JSONValue = {}
    competing_content: JSONValue = {}
    reference_videos: JSONValue = {}
    relevant_creators: JSONValue = {}
    performance_data: JSONValue = {}
    audience_reactions: JSONValue = {}
    creative_formats: List[CreativeFormat] = []
    potential_hooks: JSONValue = {}
    risks: JSONValue = {}
    confidence_level: float
    recommended_actions: JSONValue = {}


class OpportunityCreate(OpportunityBase):
    pass


class OpportunityUpdate(BaseModel):
    title: Optional[str] = None
    topic_description: Optional[str] = None
    target_audience: Optional[str] = None
    audience_need: Optional[str] = None
    market_evidence: Optional[JSONValue] = None
    relevant_trends: Optional[JSONValue] = None
    competing_content: Optional[JSONValue] = None
    reference_videos: Optional[JSONValue] = None
    relevant_creators: Optional[JSONValue] = None
    performance_data: Optional[JSONValue] = None
    audience_reactions: Optional[JSONValue] = None
    creative_formats: Optional[List[CreativeFormat]] = None
    potential_hooks: Optional[JSONValue] = None
    risks: Optional[JSONValue] = None
    confidence_level: Optional[float] = None
    recommended_actions: Optional[JSONValue] = None
    status: Optional[OpportunityStatus] = None
    rank_scores: Optional[dict] = None


class OpportunityResponse(OpportunityBase):
    id: uuid.UUID
    project_id: uuid.UUID
    status: OpportunityStatus
    rank_scores: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OpportunityListResponse(BaseModel):
    opportunities: List[OpportunityResponse]
    total: int
    page: int
    page_size: int


@router.post("/{project_id}/opportunities", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    project_id: uuid.UUID,
    opportunity_data: OpportunityCreate,
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

    opportunity = Opportunity(
        project_id=project_id,
        **opportunity_data.model_dump(),
    )
    db.add(opportunity)
    await db.commit()
    await db.refresh(opportunity)
    return opportunity


@router.get("/{project_id}/opportunities", response_model=OpportunityListResponse)
async def list_opportunities(
    project_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[OpportunityStatus] = None,
    origin: Optional[str] = Query(None, description="discovery | idea"),
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

    query = select(Opportunity).where(Opportunity.project_id == project_id)
    if status:
        query = query.where(Opportunity.status == status)
    if origin:
        query = query.where(Opportunity.market_evidence["origin"].astext == origin)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    query = query.order_by(Opportunity.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    opportunities = result.scalars().all()

    return OpportunityListResponse(
        opportunities=opportunities,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}/opportunities/{opportunity_id}", response_model=OpportunityResponse)
async def get_opportunity(
    project_id: uuid.UUID,
    opportunity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Opportunity)
        .where(Opportunity.id == opportunity_id, Opportunity.project_id == project_id)
    )
    opportunity = result.scalar_one_or_none()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opportunity


@router.patch("/{project_id}/opportunities/{opportunity_id}", response_model=OpportunityResponse)
async def update_opportunity(
    project_id: uuid.UUID,
    opportunity_id: uuid.UUID,
    opportunity_data: OpportunityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Opportunity)
        .where(Opportunity.id == opportunity_id, Opportunity.project_id == project_id)
    )
    opportunity = result.scalar_one_or_none()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    update_data = opportunity_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(opportunity, field, value)

    await db.commit()
    await db.refresh(opportunity)
    return opportunity


@router.delete("/{project_id}/opportunities/{opportunity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_opportunity(
    project_id: uuid.UUID,
    opportunity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Opportunity)
        .where(Opportunity.id == opportunity_id, Opportunity.project_id == project_id)
    )
    opportunity = result.scalar_one_or_none()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    await db.delete(opportunity)
    await db.commit()