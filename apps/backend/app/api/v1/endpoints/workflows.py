"""Module actions beyond CRUD: research, capture, investigation, intelligence, ideas,
test variants, publishing drafts and analytics. Mounted under /projects.

Every action checks that the project belongs to the signed-in user. AI steps
fall back to templates when no LLM provider is configured; responses say which
one was used ("source": "ai" | "template").
"""

import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.analytics import AnalyticsResponse
from app.api.v1.endpoints.auth import get_current_user
from app.api.v1.endpoints.investigations import InvestigationResponse
from app.api.v1.endpoints.knowledge import KnowledgeEntryResponse
from app.api.v1.endpoints.opportunities import OpportunityResponse
from app.api.v1.endpoints.references import ReferenceResponse
from app.api.v1.endpoints.tests import TestResponse
from app.db.session import get_db
from app.models.analytics import Analytics, Platform as AnalyticsPlatform
from app.models.investigation import AnalysisType, Investigation
from app.models.knowledge import KnowledgeEntry
from app.models.production import Production
from app.models.project import Project
from app.models.publication import Publication
from app.models.reference import Reference, ReferenceStatus
from app.models.strategy import CreativeStrategy
from app.models.test import Test, TestType
from app.models.user import User
from app.services import content_ai, research
from app.services.opportunity_discovery import OpportunityDiscoveryEngine
from app.services.video_sources import VideoSourceError, search_youtube, video_details

router = APIRouter()


async def _project(db: AsyncSession, project_id: uuid.UUID, user: User) -> Project:
    project = await db.scalar(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _in_project(db: AsyncSession, model, item_id: uuid.UUID, project_id: uuid.UUID, label: str):
    item = await db.scalar(select(model).where(model.id == item_id, model.project_id == project_id))
    if item is None:
        raise HTTPException(status_code=404, detail=f"{label} not found in this project")
    return item


def _bad_gateway(e: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


# ------------------------------------------------------------------ research

class SearchResult(BaseModel):
    url: str
    title: str
    platform: Optional[str]
    creator: Optional[str]
    views: Optional[int]
    duration: Optional[float]
    thumbnail_url: Optional[str]
    reference_id: Optional[uuid.UUID] = None  # set when already in the library


@router.get("/{project_id}/research/search", response_model=List[SearchResult])
async def research_search(
    project_id: uuid.UUID,
    q: str = Query(..., min_length=2, max_length=200),
    limit: int = Query(12, ge=1, le=30),
    sort: Literal["relevance", "views", "date"] = "relevance",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Live YouTube search for reference videos."""
    project = await _project(db, project_id, current_user)
    try:
        videos = await search_youtube(q, limit=limit, sort=sort, language=project.language or "en")
    except VideoSourceError as e:
        raise _bad_gateway(e)
    saved = dict(
        (await db.execute(
            select(Reference.source_url, Reference.id).where(
                Reference.project_id == project_id, Reference.source_url.in_([v.url for v in videos])
            )
        )).all()
    )
    return [
        SearchResult(url=v.url, title=v.title, platform=v.platform, creator=v.creator, views=v.views,
                     duration=v.duration, thumbnail_url=v.thumbnail_url, reference_id=saved.get(v.url))
        for v in videos
    ]


class CaptureRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=2000, pattern=r"^https?://")


@router.post("/{project_id}/references/capture", response_model=ReferenceResponse, status_code=201)
async def capture_reference(
    project_id: uuid.UUID,
    data: CaptureRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a video to the library from its URL: real metadata, stats and captions."""
    project = await _project(db, project_id, current_user)
    try:
        return await research.capture_reference(db, project, data.url)
    except research.DuplicateReference as e:
        raise HTTPException(status_code=409, detail=f"Already in your library: {e.reference.title}")
    except VideoSourceError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/{project_id}/references/{reference_id}/refresh", response_model=ReferenceResponse)
async def refresh_reference(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-fetch stats and captions for a library video."""
    project = await _project(db, project_id, current_user)
    reference = await _in_project(db, Reference, reference_id, project_id, "Reference")
    try:
        return await research.refresh_reference(db, reference, project.language or "en")
    except (VideoSourceError, ValueError) as e:
        raise HTTPException(status_code=422, detail=str(e))


# ------------------------------------------------------------- investigation

@router.get("/{project_id}/investigation-types")
async def investigation_types(project_id: uuid.UUID, db: AsyncSession = Depends(get_db),
                              current_user: User = Depends(get_current_user)):
    await _project(db, project_id, current_user)
    return [{"type": k, "description": v} for k, v in content_ai.TEXT_ANALYSES.items()]


class InvestigateRequest(BaseModel):
    analysis_types: List[AnalysisType] = Field(..., min_length=1, max_length=len(content_ai.TEXT_ANALYSES))


class InvestigateResponse(BaseModel):
    investigations: List[InvestigationResponse]
    source: str
    warning: Optional[str] = None


@router.post("/{project_id}/references/{reference_id}/investigate", response_model=InvestigateResponse)
async def investigate(
    project_id: uuid.UUID,
    reference_id: uuid.UUID,
    data: InvestigateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reverse-engineer a library video. Re-running a type replaces its previous result."""
    await _project(db, project_id, current_user)
    reference = await _in_project(db, Reference, reference_id, project_id, "Reference")
    types = [t.value for t in data.analysis_types]
    unsupported = [t for t in types if t not in content_ai.TEXT_ANALYSES]
    if unsupported:
        raise HTTPException(status_code=422, detail=f"Not available yet (needs video frames): {', '.join(unsupported)}")

    result, source = await content_ai.investigate_reference(reference, types)
    analyses = result.get("analyses") or {}

    await db.execute(delete(Investigation).where(
        Investigation.reference_id == reference.id, Investigation.analysis_type.in_(types)))
    rows = []
    for t in types:
        a = analyses.get(t) or {}
        rows.append(Investigation(
            project_id=project_id,
            reference_id=reference.id,
            analysis_type=AnalysisType(t),
            findings=a.get("findings") if isinstance(a.get("findings"), dict) else {"summary": a.get("findings")},
            evidence={"items": a.get("evidence") if isinstance(a.get("evidence"), list) else []},
            interpretations={"text": str(a.get("interpretation") or ""), "source": source},
            confidence_level=content_ai._clamp(a.get("confidence"), 0.3),
            creative_applications={"items": a.get("creative_applications") if isinstance(a.get("creative_applications"), list) else []},
            timestamped_report={"items": a.get("evidence") if isinstance(a.get("evidence"), list) else []},
        ))
    db.add_all(rows)
    reference.status = ReferenceStatus.ANALYZED
    await db.commit()
    for r in rows:
        await db.refresh(r)
    return InvestigateResponse(investigations=rows, source=source, warning=result.get("_warning"))


# ------------------------------------------------------- multi-reference DNA

class IntelligenceRequest(BaseModel):
    reference_ids: List[uuid.UUID] = Field(..., min_length=2, max_length=10)
    title: Optional[str] = Field(None, max_length=200)


class IntelligenceResponse(BaseModel):
    entry: KnowledgeEntryResponse
    source: str
    warning: Optional[str] = None


@router.post("/{project_id}/intelligence/analyze", response_model=IntelligenceResponse, status_code=201)
async def analyze_references(
    project_id: uuid.UUID,
    data: IntelligenceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Find shared patterns across references; saved to the knowledge base as creative DNA
    (strategy generation reads it from there)."""
    await _project(db, project_id, current_user)
    refs = (await db.execute(
        select(Reference).where(Reference.project_id == project_id, Reference.id.in_(data.reference_ids))
    )).scalars().all()
    if len(refs) != len(set(data.reference_ids)):
        raise HTTPException(status_code=404, detail="Some references were not found in this project")
    invs = (await db.execute(select(Investigation).where(Investigation.reference_id.in_(data.reference_ids)))).scalars().all()

    payload = []
    for r in refs:
        segs = ((r.reference_metadata or {}).get("transcript") or {}).get("segments") or []
        m = r.engagement_metrics or {}
        payload.append({
            "title": r.title, "creator": r.creator_name, "views": m.get("views"),
            "engagement_rate": m.get("engagement_rate"), "duration": r.duration,
            "tags": r.hashtags or [],
            "hook": " ".join(s["text"] for s in segs if s.get("start", 0) < 15)[:400] or None,
            "investigations": {i.analysis_type.value: {"findings": i.findings, "interpretation": i.interpretations.get("text")}
                               for i in invs if i.reference_id == r.id} or None,
        })
    result, source = await content_ai.synthesize_references(payload)
    warning = result.pop("_warning", None)
    entry = KnowledgeEntry(
        project_id=project_id,
        category="creative_dna",
        title=data.title or f"Creative DNA from {len(refs)} references",
        content=result,
        evidence={"reference_ids": [str(r.id) for r in refs], "titles": [r.title for r in refs]},
        source_type="multi_reference",
        source_reference=",".join(str(r.id) for r in refs),
        confidence_level=0.7 if source == "ai" else 0.3,
        tags=["creative-dna"],
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return IntelligenceResponse(entry=entry, source=source, warning=warning)


# ---------------------------------------------------------------------- ideas

class IdeaRequest(BaseModel):
    concept: str = Field(..., min_length=5, max_length=1000)
    audience: Optional[str] = Field(None, max_length=1000)


class IdeaResponse(BaseModel):
    opportunity: OpportunityResponse
    videos_analyzed: int
    used_ai: bool
    warnings: List[str]


@router.post("/{project_id}/ideas/validate", response_model=IdeaResponse, status_code=201)
async def validate_idea(
    project_id: uuid.UUID,
    data: IdeaRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Validate your own idea against what is already on YouTube."""
    project = await _project(db, project_id, current_user)
    result = await OpportunityDiscoveryEngine(db).validate_idea(project, data.concept, data.audience)
    return IdeaResponse(opportunity=result.opportunities[0], videos_analyzed=result.videos_analyzed,
                        used_ai=result.used_ai, warnings=result.warnings)


# -------------------------------------------------------------------- testing

class TestGenerateRequest(BaseModel):
    production_id: uuid.UUID
    test_type: TestType
    variant_count: int = Field(3, ge=2, le=5)


@router.post("/{project_id}/tests/generate", response_model=TestResponse, status_code=201)
async def generate_test(
    project_id: uuid.UUID,
    data: TestGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an A/B test with generated variants and a hypothesis."""
    await _project(db, project_id, current_user)
    production = await _in_project(db, Production, data.production_id, project_id, "Production")
    strategy = await db.get(CreativeStrategy, production.strategy_id)
    result, source = await content_ai.generate_test_variants(data.test_type.value, production, strategy, data.variant_count)
    test = Test(
        project_id=project_id,
        production_id=production.id,
        test_type=data.test_type,
        variants={"items": result.get("variants") or [], "source": source},
        results={},
        quality_assessment={},
        performance_hypothesis=result.get("performance_hypothesis") or {},
        audience_experiment=result.get("audience_experiment") or {},
        status="running",
    )
    db.add(test)
    await db.commit()
    await db.refresh(test)
    return test


# ----------------------------------------------------------------- publishing

class DraftRequest(BaseModel):
    production_id: uuid.UUID
    platform: AnalyticsPlatform


class DraftResponse(BaseModel):
    title: str
    description: str
    tags: List[str]
    hashtags: List[str]
    best_posting_time: Optional[str] = None
    thumbnail_text: Optional[str] = None
    source: str
    warning: Optional[str] = None


@router.post("/{project_id}/publications/draft", response_model=DraftResponse)
async def draft_publication(
    project_id: uuid.UUID,
    data: DraftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Suggest platform-optimised title, description and tags (not saved)."""
    await _project(db, project_id, current_user)
    production = await _in_project(db, Production, data.production_id, project_id, "Production")
    strategy = await db.get(CreativeStrategy, production.strategy_id)
    result, source = await content_ai.draft_publication(data.platform.value, strategy, production)
    return DraftResponse(
        title=str(result.get("title") or "")[:300],
        description=str(result.get("description") or ""),
        tags=result.get("tags") or [],
        hashtags=result.get("hashtags") or [],
        best_posting_time=result.get("best_posting_time"),
        thumbnail_text=result.get("thumbnail_text"),
        source=source,
        warning=result.get("_warning"),
    )


# ------------------------------------------------------------------ analytics

class FetchStatsRequest(BaseModel):
    publication_id: uuid.UUID


@router.post("/{project_id}/analytics/fetch", response_model=AnalyticsResponse)
async def fetch_stats(
    project_id: uuid.UUID,
    data: FetchStatsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pull public stats (views, likes, comments) from the published video's URL."""
    await _project(db, project_id, current_user)
    publication = await _in_project(db, Publication, data.publication_id, project_id, "Publication")
    if not publication.platform_url:
        raise HTTPException(status_code=400, detail="Add the published video's URL to this publication first")
    try:
        info = await video_details(publication.platform_url)
    except VideoSourceError as e:
        raise HTTPException(status_code=422, detail=str(e))

    now = datetime.now(timezone.utc)
    analytics = await db.scalar(
        select(Analytics).where(Analytics.publication_id == publication.id).order_by(Analytics.collected_at.desc())
    )
    if analytics is None:
        analytics = Analytics(project_id=project_id, publication_id=publication.id,
                              platform=AnalyticsPlatform(publication.platform.value), performance_over_time={})
        db.add(analytics)
    analytics.views = info.views or 0
    analytics.likes = info.likes or 0
    analytics.comments = info.comments or 0
    analytics.engagement_rate = info.engagement_rate or 0.0
    history = list((analytics.performance_over_time or {}).get("snapshots", []))
    history.append({"at": now.isoformat(), "views": info.views, "likes": info.likes, "comments": info.comments})
    analytics.performance_over_time = {"snapshots": history[-100:]}
    if publication.published_at is None and info.published_at:
        publication.published_at = info.published_at
    await db.commit()
    await db.refresh(analytics)
    return analytics


class InsightsResponse(BaseModel):
    analytics: AnalyticsResponse
    learnings_saved: int
    source: str
    warning: Optional[str] = None


@router.post("/{project_id}/analytics/{analytics_id}/insights", response_model=InsightsResponse)
async def analytics_insights(
    project_id: uuid.UUID,
    analytics_id: uuid.UUID,
    save_learnings: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Diagnose performance; optionally save the learnings to the knowledge base."""
    await _project(db, project_id, current_user)
    analytics = await _in_project(db, Analytics, analytics_id, project_id, "Analytics record")
    publication = await db.get(Publication, analytics.publication_id)
    production = await db.get(Production, publication.production_id) if publication else None
    strategy = await db.get(CreativeStrategy, production.strategy_id) if production else None
    tests = (await db.execute(select(Test).where(Test.production_id == production.id))).scalars().all() if production else []
    predictions = {t.test_type.value: t.performance_hypothesis for t in tests} or None

    result, source = await content_ai.analytics_insights(analytics, publication, strategy, predictions)
    analytics.successful_elements = {"items": result.get("successful_elements") or []}
    analytics.weak_points = {"items": result.get("weak_points") or []}
    analytics.improvement_opps = {"items": result.get("improvement_opps") or []}
    if isinstance(result.get("predicted_vs_actual"), dict):
        analytics.predicted_vs_actual = result["predicted_vs_actual"]

    saved = 0
    if save_learnings:
        for item in result.get("learnings") or []:
            if not isinstance(item, dict) or not item.get("title"):
                continue
            db.add(KnowledgeEntry(
                project_id=project_id,
                category=str(item.get("category") or "performance")[:100],
                title=str(item["title"])[:300],
                content={"insight": item.get("insight")},
                evidence={"analytics_id": str(analytics.id), "views": analytics.views,
                          "engagement_rate": analytics.engagement_rate},
                source_type="analytics",
                source_reference=str(analytics.id),
                confidence_level=content_ai._clamp(item.get("confidence"), 0.5),
                tags=["performance"],
            ))
            saved += 1
    await db.commit()
    await db.refresh(analytics)
    return InsightsResponse(analytics=analytics, learnings_saved=saved, source=source, warning=result.get("_warning"))
