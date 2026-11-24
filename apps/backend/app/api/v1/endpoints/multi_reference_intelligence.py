from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.reference import Reference
from app.models.project import Project
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.services.multi_reference_intelligence import (
    MultiReferenceIntelligenceService,
    MultiReferenceAnalysisRequest,
    MultiReferenceAnalysisResponse,
)

router = APIRouter()


@router.post(
    "/{project_id}/multi-reference-analysis",
    response_model=MultiReferenceAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
async def analyze_multiple_references(
    project_id: uuid.UUID,
    analysis_request: MultiReferenceAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze multiple references to extract shared creative DNA and patterns."""
    # Verify project ownership
    from sqlalchemy import select
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify all references belong to project
    from sqlalchemy import select
    from app.models.reference import Reference
    from uuid import UUID

    reference_uuids = [UUID(rid) for rid in analysis_request.reference_ids]
    result = await db.execute(
        select(Reference).where(
            Reference.id.in_(reference_uuids),
            Reference.project_id == project_id
        )
    )
    found_references = result.scalars().all()
    if len(found_references) != len(analysis_request.reference_ids):
        raise HTTPException(status_code=404, detail="One or more references not found in this project")

    # Ensure analysis request has correct project_id
    analysis_request.project_id = project_id

    service = MultiReferenceIntelligenceService(db)
    return await service.analyze_references(analysis_request)


@router.get(
    "/{project_id}/multi-reference-analysis/{analysis_id}",
    response_model=MultiReferenceAnalysisResponse,
)
async def get_analysis(
    project_id: uuid.UUID,
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get multi-reference analysis results."""
    # Verify project ownership
    from sqlalchemy import select
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = MultiReferenceIntelligenceService(db)
    analysis = await service.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return analysis


@router.get(
    "/{project_id}/multi-reference-analysis",
    response_model=dict,
)
async def list_analyses(
    project_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all multi-reference analyses for a project."""
    # Verify project ownership
    from sqlalchemy import select
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = MultiReferenceIntelligenceService(db)
    return await service.list_analyses(project_id=str(project_id), page=page, page_size=page_size)


@router.post(
    "/{project_id}/multi-reference-analysis/dna",
    response_model=dict,
)
async def extract_shared_dna(
    project_id: uuid.UUID,
    reference_ids: list[str],
    min_frequency: int = Query(2, ge=1),
    min_confidence: float = Query(0.7, ge=0.0, le=1.0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Extract shared creative DNA from selected references."""
    # Verify project ownership
    from sqlalchemy import select
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify references belong to project
    from sqlalchemy import select
    from app.models.reference import Reference
    from uuid import UUID

    reference_uuids = [UUID(rid) for rid in reference_ids]
    result = await db.execute(
        select(Reference).where(
            Reference.id.in_(reference_uuids),
            Reference.project_id == project_id
        )
    )
    found_references = result.scalars().all()
    if len(found_references) != len(reference_ids):
        raise HTTPException(status_code=404, detail="One or more references not found in this project")

    service = MultiReferenceIntelligenceService(db)
    request = MultiReferenceAnalysisRequest(
        project_id=project_id,
        reference_ids=reference_ids,
        min_pattern_frequency=min_frequency,
        min_confidence=0.7,
    )
    analysis = await service.analyze_references(request)

    return {
        "shared_dna": analysis.shared_dna,
        "style_profile": analysis.style_profile,
        "storytelling_profile": analysis.storytelling_profile,
        "transfer_principles": analysis.transfer_principles,
        "performance_comparison": analysis.performance_comparison,
        "creative_outliers": analysis.creative_outliers,
    }