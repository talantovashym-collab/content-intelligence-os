from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.reference import Reference
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.services.media_engineering import (
    MediaEngineeringService,
    MediaEngineeringRequest,
    MediaEngineeringResponse,
    AnalysisType,
    FrameExtractionConfig,
    SceneDetectionConfig,
    OCRConfig,
    AudioTranscriptionConfig,
    CreativeAnalysisConfig,
)

router = APIRouter()


@router.post(
    "/{project_id}/references/{reference_id}/analyze",
    response_model=MediaEngineeringResponse,
    status_code=status.HTTP_201_CREATED,
)
async def analyze_media(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    analysis_request: MediaEngineeringRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start media engineering analysis for a reference."""
    # Verify project ownership and reference belongs to project
    from sqlalchemy import select
    result = await db.execute(
        select(Reference).where(
            Reference.id == reference_id,
            Reference.project_id == project_id
        )
    )
    reference = result.scalar_one_or_none()
    if not reference:
        raise HTTPException(status_code=404, detail="Reference not found in this project")

    # Verify project ownership
    from app.models.project import Project
    from sqlalchemy import select
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    analysis_request.reference_id = reference_id
    service = MediaEngineeringService(db)
    return await service.analyze_media(analysis_request)


@router.get(
    "/{project_id}/references/{reference_id}/analysis/{analysis_id}",
    response_model=MediaEngineeringResponse,
)
async def get_analysis(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    analysis_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get analysis status and results."""
    # TODO: Implement analysis status retrieval
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get(
    "/{project_id}/references/{reference_id}/analyses",
    response_model=dict,
)
async def list_analyses(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all analyses for a reference."""
    service = MediaEngineeringService(db)
    return await service.list_analyses(reference_id=reference_id, page=page, page_size=page_size)


@router.post(
    "/{project_id}/references/{reference_id}/extract-frames",
    response_model=dict,
)
async def extract_frames(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    config: Optional[FrameExtractionConfig] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Extract frames from video reference."""
    # Verify reference exists in project
    from sqlalchemy import select
    result = await db.execute(
        select(Reference).where(
            Reference.id == reference_id,
            Reference.project_id == project_id
        )
    )
    reference = result.scalar_one_or_none()
    if not reference:
        raise HTTPException(status_code=404, detail="Reference not found")

    service = MediaEngineeringService(db)
    return await service._extract_frames(reference_id, config or FrameExtractionConfig())


@router.post(
    "/{project_id}/references/{reference_id}/detect-scenes",
    response_model=dict,
)
async def detect_scenes(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    config: Optional[SceneDetectionConfig] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Detect scenes in video reference."""
    # Verify reference exists in project
    from sqlalchemy import select
    result = await db.execute(
        select(Reference).where(
            Reference.id == reference_id,
            Reference.project_id == project_id
        )
    )
    reference = result.scalar_one_or_none()
    if not reference:
        raise HTTPException(status_code=404, detail="Reference not found")

    service = MediaEngineeringService(db)
    return await service._detect_scenes(reference_id, config or SceneDetectionConfig())


@router.post(
    "/{project_id}/references/{reference_id}/transcribe",
    response_model=dict,
)
async def transcribe_audio(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    config: Optional[AudioTranscriptionConfig] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transcribe audio from reference."""
    # Verify reference exists in project
    from sqlalchemy import select
    result = await db.execute(
        select(Reference).where(
            Reference.id == reference_id,
            Reference.project_id == project_id
        )
    )
    reference = result.scalar_one_or_none()
    if not reference:
        raise HTTPException(status_code=404, detail="Reference not found")

    service = MediaEngineeringService(db)
    return await service._transcribe_audio(reference_id, config or AudioTranscriptionConfig())


@router.post(
    "/{project_id}/references/{reference_id}/analyze-creative",
    response_model=dict,
)
async def analyze_creative_techniques(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    config: Optional[CreativeAnalysisConfig] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze creative techniques in reference."""
    # Verify reference exists in project
    from sqlalchemy import select
    result = await db.execute(
        select(Reference).where(
            Reference.id == reference_id,
            Reference.project_id == project_id
        )
    )
    reference = result.scalar_one_or_none()
    if not reference:
        raise HTTPException(status_code=404, detail="Reference not found")

    service = MediaEngineeringService(db)
    return await service._analyze_creative_techniques(reference_id, config or CreativeAnalysisConfig())