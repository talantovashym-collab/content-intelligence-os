from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    projects,
    opportunities,
    references,
    investigations,
    strategies,
    productions,
    tests,
    publications,
    analytics,
    knowledge,
    opportunity_discovery,
    reference_capture,
    media_engineering,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(opportunities.router, prefix="/opportunities", tags=["opportunities"])
api_router.include_router(references.router, prefix="/references", tags=["references"])
api_router.include_router(investigations.router, prefix="/investigations", tags=["investigations"])
api_router.include_router(strategies.router, prefix="/strategies", tags=["strategies"])
api_router.include_router(productions.router, prefix="/productions", tags=["productions"])
api_router.include_router(tests.router, prefix="/tests", tags=["tests"])
api_router.include_router(publications.router, prefix="/publications", tags=["publications"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
api_router.include_router(opportunity_discovery.router, prefix="/projects", tags=["opportunity-discovery"])
api_router.include_router(reference_capture.router, prefix="/projects", tags=["reference-capture"])
api_router.include_router(media_engineering.router, prefix="/projects", tags=["media-engineering"])