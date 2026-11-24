import asyncio
import uuid
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.services.reference_capture.schemas import (
    ReferenceCaptureRequest,
    ReferenceCaptureResponse,
    BatchCaptureRequest,
    BatchCaptureResponse,
    ReferenceStatusUpdate,
    ReferenceStatus,
    MediaType,
    Platform,
)
from app.models.reference import Reference
from app.models.project import Project
from app.core.config import settings

logger = logging.getLogger(__name__)


class ReferenceCaptureService:
    """Service for capturing, downloading, and indexing reference media."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.storage_path = Path(settings.LOCAL_STORAGE_PATH) / "references"
        self.storage_path.mkdir(parents=True, exist_ok=True)

    async def capture_reference(
        self, request: ReferenceCaptureRequest, project_id: uuid.UUID
    ) -> ReferenceCaptureResponse:
        """Capture a single reference from URL."""
        # Create reference record
        reference = Reference(
            id=uuid.uuid4(),
            project_id=project_id,
            source_url=str(request.source_url),
            source_platform=Platform(request.source_platform) if request.source_platform else None,
            title=request.title or "Untitled",
            description=request.description,
            media_type=MediaType(request.media_type),
            status=ReferenceStatus.PENDING,
            metadata={},
        )
        self.db.add(reference)
        await self.db.commit()
        await self.db.refresh(reference)

        # Start async processing
        asyncio.create_task(self._process_reference(reference, request))

        return ReferenceCaptureResponse.model_validate(reference)

    async def capture_batch(
        self, request: BatchCaptureRequest
    ) -> BatchCaptureResponse:
        """Capture multiple references."""
        successful = []
        failed = []

        for ref_request in request.references:
            try:
                response = await self.capture_reference(ref_request, request.project_id)
                successful.append(response)
            except Exception as e:
                failed.append({
                    "url": str(ref_request.source_url),
                    "error": str(e),
                })

        return BatchCaptureResponse(
            successful=successful,
            failed=failed,
            total=len(request.references),
            successful_count=len(successful),
            failed_count=len(failed),
        )

    async def _process_reference(
        self, reference: Reference, request: ReferenceCaptureRequest
    ) -> None:
        """Process reference: download, index, analyze."""
        try:
            reference.status = ReferenceStatus.DOWNLOADING
            await self.db.commit()

            # Download media
            local_path = await self._download_media(reference)
            if not local_path:
                reference.status = ReferenceStatus.FAILED
                reference.error_message = "Failed to download media"
                await self.db.commit()
                return

            reference.local_path = str(local_path)
            reference.status = ReferenceStatus.DOWNLOADED
            await self.db.commit()

            # Index/analyze if requested
            if request.auto_analyze:
                reference.status = ReferenceStatus.INDEXING
                await self.db.commit()

                await self._index_media(reference, request.analysis_types)

                reference.status = ReferenceStatus.ANALYZED
            else:
                reference.status = ReferenceStatus.INDEXED

            await self.db.commit()

        except Exception as e:
            logger.error(f"Error processing reference {reference.id}: {e}")
            reference.status = ReferenceStatus.FAILED
            reference.error_message = str(e)
            await self.db.commit()

    async def _download_media(self, reference: Reference) -> Optional[Path]:
        """Download media from source URL."""
        # TODO: Implement actual download logic using yt-dlp, ffmpeg, etc.
        # For now, return a placeholder
        # This would use yt-dlp for YouTube/TikTok, direct download for others
        return None

    async def _index_media(self, reference: Reference, analysis_types: List[str]) -> None:
        """Index media for analysis."""
        # TODO: Implement media indexing
        # This would extract metadata, create thumbnails, etc.
        pass

    async def update_status(
        self, reference_id: uuid.UUID, update: ReferenceStatusUpdate
    ) -> Optional[Reference]:
        """Update reference status."""
        result = await self.db.execute(
            select(Reference).where(Reference.id == reference_id)
        )
        reference = result.scalar_one_or_none()
        if not reference:
            return None

        reference.status = update.status
        if update.error_message:
            reference.error_message = update.error_message
        if update.metadata:
            reference.metadata = {**reference.metadata, **update.metadata}

        await self.db.commit()
        await self.db.refresh(reference)
        return reference

    async def get_reference(self, reference_id: uuid.UUID) -> Optional[Reference]:
        """Get reference by ID."""
        result = await self.db.execute(
            select(Reference)
            .where(Reference.id == reference_id)
            .options(selectinload(Reference.investigations))
        )
        return result.scalar_one_or_none()

    async def list_references(
        self,
        project_id: uuid.UUID,
        status: Optional[ReferenceStatus] = None,
        media_type: Optional[MediaType] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """List references for a project."""
        query = select(Reference).where(Reference.project_id == project_id)
        if status:
            query = query.where(Reference.status == status)
        if media_type:
            query = query.where(Reference.media_type == media_type)

        # Get total count
        from sqlalchemy import func
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        # Get paginated results
        query = query.order_by(Reference.created_at.desc()).offset(
            (page - 1) * page_size
        ).limit(page_size)
        result = await self.db.execute(query)
        references = result.scalars().all()

        return {
            "references": [ReferenceCaptureResponse.model_validate(r) for r in references],
            "total": total,
            "page": page,
            "page_size": page_size,
        }