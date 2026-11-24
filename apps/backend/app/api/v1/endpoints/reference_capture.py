from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import uuid

from app.db.session import get_db
from app.models.project import Project
from app.models.reference import Reference
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.services.reference_capture import (
    ReferenceCaptureService,
    ReferenceCaptureRequest,
    ReferenceCaptureResponse,
    BatchCaptureRequest,
    BatchCaptureResponse,
    ReferenceStatusUpdate,
    ReferenceStatus,
    MediaType,
    Platform,
)

router = APIRouter()


@router.post(
    "/{project_id}/references",
    response_model=ReferenceCaptureResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_reference(
    project_id: uuid.UUID,
    reference_data: ReferenceCaptureRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Capture a new reference from URL."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = ReferenceCaptureService(db)
    return await service.capture_reference(reference_data, project_id)


@router.post(
    "/{project_id}/references/batch",
    response_model=BatchCaptureResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_references_batch(
    project_id: uuid.UUID,
    batch_data: BatchCaptureRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Capture multiple references in batch."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    batch_data.project_id = project_id
    service = ReferenceCaptureService(db)
    return await service.capture_batch(batch_data)


@router.get(
    "/{project_id}/references",
    response_model=dict,
)
async def list_references(
    project_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    media_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List references for a project."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = ReferenceCaptureService(db)
    return await service.list_references(
        project_id=project_id,
        status=ReferenceStatus(status) if status else None,
        media_type=MediaType(media_type) if media_type else None,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{project_id}/references/{reference_id}",
    response_model=ReferenceCaptureResponse,
)
async def get_reference(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific reference."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = ReferenceCaptureService(db)
    reference = await service.get_reference(reference_id)
    if not reference or reference.project_id != project_id:
        raise HTTPException(status_code=404, detail="Reference not found")

    return reference


@router.patch(
    "/{project_id}/references/{reference_id}",
    response_model=ReferenceCaptureResponse,
)
async def update_reference(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    update_data: ReferenceStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update reference status."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = ReferenceCaptureService(db)
    reference = await service.update_status(reference_id, update_data)
    if not reference or reference.project_id != project_id:
        raise HTTPException(status_code=404, detail="Reference not found")

    return reference


@router.delete(
    "/{project_id}/references/{reference_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_reference(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a reference."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Reference).where(Reference.id == reference_id, Reference.project_id == project_id)
    )
    reference = result.scalar_one_or_none()
    if not reference:
        raise HTTPException(status_code=404, detail="Reference not found")

    await db.execute(delete(Reference).where(Reference.id == reference_id))
    await db.commit()