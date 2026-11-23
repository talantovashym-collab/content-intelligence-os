from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.investigation import Investigation, AnalysisType
from app.models.reference import Reference
from app.models.project import Project
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class InvestigationBase(BaseModel):
    reference_id: uuid.UUID
    analysis_type: AnalysisType
    findings: dict = {}
    evidence: dict = {}
    interpretations: dict = {}
    confidence_level: float
    creative_applications: dict = {}
    timestamped_report: dict = {}


class InvestigationCreate(InvestigationBase):
    pass


class InvestigationUpdate(BaseModel):
    reference_id: Optional[uuid.UUID] = None
    analysis_type: Optional[AnalysisType] = None
    findings: Optional[dict] = None
    evidence: Optional[dict] = None
    interpretations: Optional[dict] = None
    confidence_level: Optional[float] = None
    creative_applications: Optional[dict] = None
    timestamped_report: Optional[dict] = None


class InvestigationResponse(InvestigationBase):
    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InvestigationListResponse(BaseModel):
    investigations: List[InvestigationResponse]
    total: int
    page: int
    page_size: int


@router.post("/{project_id}/investigations", response_model=InvestigationResponse, status_code=status.HTTP_201_CREATED)
async def create_investigation(
    project_id: uuid.UUID,
    investigation_data: InvestigationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify reference belongs to project
    result = await db.execute(
        select(Reference).where(
            Reference.id == investigation_data.reference_id,
            Reference.project_id == project_id
        )
    )
    reference = result.scalar_one_or_none()
    if not reference:
        raise HTTPException(status_code=404, detail="Reference not found in this project")

    investigation = Investigation(
        project_id=project_id,
        **investigation_data.model_dump(),
    )
    db.add(investigation)
    await db.commit()
    await db.refresh(investigation)
    return investigation


@router.get("/{project_id}/investigations", response_model=InvestigationListResponse)
async def list_investigations(
    project_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    analysis_type: Optional[AnalysisType] = None,
    reference_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = select(Investigation).where(Investigation.project_id == project_id)
    if analysis_type:
        query = query.where(Investigation.analysis_type == analysis_type)
    if reference_id:
        query = query.where(Investigation.reference_id == reference_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    query = query.order_by(Investigation.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    investigations = result.scalars().all()

    return InvestigationListResponse(
        investigations=investigations,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}/investigations/{investigation_id}", response_model=InvestigationResponse)
async def get_investigation(
    project_id: uuid.UUID,
    investigation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Investigation)
        .where(Investigation.id == investigation_id, Investigation.project_id == project_id)
    )
    investigation = result.scalar_one_or_none()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation


@router.patch("/{project_id}/investigations/{investigation_id}", response_model=InvestigationResponse)
async def update_investigation(
    project_id: uuid.UUID,
    investigation_id: uuid.UUID,
    investigation_data: InvestigationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Investigation)
        .where(Investigation.id == investigation_id, Investigation.project_id == project_id)
    )
    investigation = result.scalar_one_or_none()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    update_data = investigation_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(investigation, field, value)

    await db.commit()
    await db.refresh(investigation)
    return investigation


@router.delete("/{project_id}/investigations/{investigation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_investigation(
    project_id: uuid.UUID,
    investigation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Investigation)
        .where(Investigation.id == investigation_id, Investigation.project_id == project_id)
    )
    investigation = result.scalar_one_or_none()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    await db.delete(investigation)
    await db.commit()