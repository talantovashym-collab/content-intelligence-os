from celery import shared_task
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import asyncio
import uuid

from app.core.config import settings
from app.services.opportunity_discovery import OpportunityDiscoveryEngine
from app.services.opportunity_discovery.schemas import (
    OpportunityDiscoveryRequest,
    Platform,
    CreativeFormat,
)
from app.models.project import Project
from app.services import llm


# Create async engine for Celery tasks
async_engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
AsyncSessionLocal = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def run_scheduled_discovery(self):
    """Run scheduled opportunity discovery for all active projects."""
    return asyncio.run(_run_scheduled_discovery_async())


async def _run_scheduled_discovery_async():
    # Each run calls YouTube and the paid LLM for every early-stage project, so it is opt-in
    if not settings.AUTO_DISCOVERY_ENABLED:
        return {"skipped": "AUTO_DISCOVERY_ENABLED is false"}
    async with AsyncSessionLocal() as db:
        # Find projects with auto-discovery enabled
        result = await db.execute(
            select(Project).where(Project.stage.in_(["IDEA", "RESEARCH"]))
        )
        projects = result.scalars().all()

        results = []
        for project in projects:
            try:
                # Create discovery request based on project settings
                request = OpportunityDiscoveryRequest(
                    niche=project.niche,
                    audience=project.target_audience,
                    language=project.language,
                    country=project.country,
                    platforms=[Platform.YOUTUBE],  # Default, could be from project.platforms
                    date_range_days=7,
                    max_results=5,
                )

                # Background jobs run with the project owner's own AI keys
                await llm.use_user(db, project.user_id)
                engine = OpportunityDiscoveryEngine(db)
                response = await engine.discover_opportunities(request, project)

                results.append({
                    "project_id": str(project.id),
                    "opportunities_found": len(response.opportunities),
                    "status": "success",
                })
            except Exception as e:
                results.append({
                    "project_id": str(project.id),
                    "status": "error",
                    "error": str(e),
                })

        return {"processed_projects": len(projects), "results": results}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def run_discovery_for_project(self, project_id: str, request_data: dict):
    """Run opportunity discovery for a specific project."""
    return asyncio.run(_run_discovery_for_project_async(project_id, request_data))


async def _run_discovery_for_project_async(project_id: str, request_data: dict):
    async with AsyncSessionLocal() as db:
        # Convert request data to schema
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

        request = OpportunityDiscoveryRequest(
            niche=request_data.get("niche"),
            audience=request_data.get("audience"),
            language=request_data.get("language", "en"),
            country=request_data.get("country", "US"),
            platforms=[platform_map.get(p, Platform.YOUTUBE) for p in request_data.get("platforms", ["youtube"])],
            date_range_days=request_data.get("date_range_days", 30),
            content_types=[format_map.get(f, CreativeFormat.EDUCATIONAL) for f in request_data.get("content_types", [])],
            creator_size_min=request_data.get("creator_size_min"),
            creator_size_max=request_data.get("creator_size_max"),
            min_engagement_rate=request_data.get("min_engagement_rate", 0.02),
            max_results=min(request_data.get("max_results", 5), 8),
            include_competitor_analysis=request_data.get("include_competitor_analysis", True),
            include_trend_analysis=request_data.get("include_trend_analysis", True),
        )

        project = await db.get(Project, uuid.UUID(project_id))
        if project is None:
            return {"project_id": project_id, "status": "error", "error": "Project not found"}

        await llm.use_user(db, project.user_id)
        engine = OpportunityDiscoveryEngine(db)
        response = await engine.discover_opportunities(request, project)

        return {
            "project_id": project_id,
            "opportunities_found": len(response.opportunities),
            "status": "success",
        }