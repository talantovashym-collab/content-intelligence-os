from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.project import Project
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.services.opportunity_discovery import (
    OpportunityDiscoveryEngine,
    OpportunityDiscoveryRequest,
    OpportunityDiscoveryResponse,
)
from pydantic import BaseModel

router = APIRouter()


class DiscoveryStartRequest(BaseModel):
    niche: Optional[str] = None
    audience: Optional[str] = None
    language: str = "en"
    country: str = "US"
    platforms: list[str] = ["youtube"]
    date_range_days: int = 30
    content_types: list[str] = []
    creator_size_min: Optional[int] = None
    creator_size_max: Optional[int] = None
    min_engagement_rate: float = 0.02
    max_results: int = 20
    include_competitor_analysis: bool = True
    include_trend_analysis: bool = True


@router.post("/{project_id}/discover", response_model=OpportunityDiscoveryResponse)
async def start_discovery(
    project_id: uuid.UUID,
    discovery_request: DiscoveryStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start AI-powered opportunity discovery for a project.
    Researches trends, analyzes competitors, finds references, and generates ranked opportunities.
    """
    # Verify project ownership
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Convert to service request
    from app.services.opportunity_discovery.schemas import Platform, CreativeFormat

    platform_map = {
        "youtube": Platform.YOUTUBE,
        "tiktok": Platform.TIKTOK,
        "instagram": Platform.INSTAGRAM,
        "facebook": Platform.FACEBOOK,
        "twitter": Platform.TWITTER,
        "linkedin": Platform.LINKEDIN,
    }

    format_map = {
        "stickman": CreativeFormat.STICKMAN,
        "doodle": CreativeFormat.DOODLE,
        "whiteboard": CreativeFormat.WHITEBOARD,
        "cartoon": CreativeFormat.CARTOON,
        "motion_graphics": CreativeFormat.MOTION_GRAPHICS,
        "cinematic": CreativeFormat.CINEMATIC,
        "documentary": CreativeFormat.DOCUMENTARY,
        "educational": CreativeFormat.EDUCATIONAL,
    }

    service_request = OpportunityDiscoveryRequest(
        niche=discovery_request.niche,
        audience=discovery_request.audience,
        language=discovery_request.language,
        country=discovery_request.country,
        platforms=[platform_map.get(p, Platform.YOUTUBE) for p in discovery_request.platforms],
        date_range_days=discovery_request.date_range_days,
        content_types=[format_map.get(f, CreativeFormat.EDUCATIONAL) for f in discovery_request.content_types],
        creator_size_min=discovery_request.creator_size_min,
        creator_size_max=discovery_request.creator_size_max,
        min_engagement_rate=discovery_request.min_engagement_rate,
        max_results=discovery_request.max_results,
        include_competitor_analysis=discovery_request.include_competitor_analysis,
        include_trend_analysis=discovery_request.include_trend_analysis,
    )

    # Run discovery engine
    engine = OpportunityDiscoveryEngine(db)
    response = await engine.discover_opportunities(service_request, str(project_id))

    return response


@router.get("/{project_id}/discover/status")
async def get_discovery_status(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the status of opportunity discovery for a project."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # For now, return basic info - in production this would track async job status
    return {
        "project_id": str(project_id),
        "status": "completed",  # or "running", "pending"
        "message": "Discovery completed. Check opportunities endpoint for results.",
    }