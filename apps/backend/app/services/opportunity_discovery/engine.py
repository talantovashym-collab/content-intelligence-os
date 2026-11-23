import asyncio
import random
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.opportunity_discovery.schemas import (
    OpportunityDiscoveryRequest,
    OpportunityDiscoveryResponse,
    DiscoveredOpportunity,
    OpportunityRanking,
    TrendData,
    CreatorData,
    CompetitorData,
    ReferenceVideo,
    Platform,
    CreativeFormat,
)
from app.models.opportunity import Opportunity, OpportunityStatus, CreativeFormat as DBCreativeFormat
from app.models.project import Project


class OpportunityDiscoveryEngine:
    """
    AI-powered opportunity discovery engine that researches trends,
    finds gaps, analyzes competitors, and generates ranked content opportunities.
    """

    # Platform-specific trend keywords and niches for simulation
    PLATFORM_TRENDS = {
        Platform.YOUTUBE: [
            "AI tutorials", "productivity", "finance education", "tech reviews",
            "coding tutorials", "side hustles", "minimalism", "fitness science"
        ],
        Platform.TIKTOK: [
            "life hacks", "storytime", "POV skits", "quick recipes",
            "aesthetic room tours", "book recommendations", "study with me", "finance tips"
        ],
        Platform.INSTAGRAM: [
            "reels tutorials", "carousels", "aesthetic lifestyle", "behind the scenes",
            "transformation", "daily routine", "product recommendations", "Q&A"
        ],
    }

    NICHES = [
        "personal finance", "productivity", "tech/AI", "health/fitness",
        "education/learning", "lifestyle/minimalism", "business/entrepreneurship",
        "creativity/art", "relationships/psychology", "career/development"
    ]

    def __init__(self, db: AsyncSession):
        self.db = db

    async def discover_opportunities(
        self,
        request: OpportunityDiscoveryRequest,
        project_id: Optional[str] = None,
    ) -> OpportunityDiscoveryResponse:
        """
        Main entry point for opportunity discovery.
        Researches trends, analyzes competitors, finds reference videos,
        and generates ranked opportunities.
        """
        # Simulate research process
        trends = await self._research_trends(request)
        creators = await self._find_creators(request, trends)
        competitors = await self._analyze_competitors(request, trends)
        reference_videos = await self._find_reference_videos(request, trends, creators)

        # Generate opportunities from research
        opportunities = await self._generate_opportunities(
            request, trends, creators, competitors, reference_videos
        )

        # Rank opportunities
        ranked_opportunities = self._rank_opportunities(opportunities, request)

        # Store in database if project_id provided
        if project_id:
            await self._store_opportunities(project_id, ranked_opportunities)

        return OpportunityDiscoveryResponse(
            opportunities=ranked_opportunities,
            total_analyzed=len(trends) + len(creators) + len(competitors),
            search_metadata={
                "niche": request.niche,
                "platforms": [p.value for p in request.platforms],
                "date_range_days": request.date_range_days,
                "trends_found": len(trends),
                "creators_analyzed": len(creators),
                "competitors_analyzed": len(competitors),
            },
        )

    async def _research_trends(self, request: OpportunityDiscoveryRequest) -> List[TrendData]:
        """Research trending topics and keywords across platforms."""
        trends = []
        niches = [request.niche] if request.niche else self.NICHES[:5]

        for platform in request.platforms:
            platform_trends = self.PLATFORM_TRENDS.get(platform, self.PLATFORM_TRENDS[Platform.YOUTUBE])

            for i, niche in enumerate(niches):
                for j, keyword in enumerate(platform_trends[:4]):
                    # Simulate trend data with some randomness
                    base_volume = random.randint(10000, 500000)
                    growth = random.uniform(-0.2, 0.8)

                    trend = TrendData(
                        keyword=f"{niche}: {keyword}",
                        platform=platform,
                        search_volume=int(base_volume * (1 + growth)),
                        growth_rate=round(growth * 100, 1),
                        related_keywords=[
                            f"{keyword} tips",
                            f"{keyword} tutorial",
                            f"best {keyword}",
                            f"{keyword} for beginners",
                        ],
                        geographic_interest={
                            "US": random.randint(30, 50),
                            "UK": random.randint(5, 15),
                            "CA": random.randint(5, 10),
                            "AU": random.randint(3, 8),
                            "Other": random.randint(20, 40),
                        },
                        seasonal_pattern={
                            "Q1": random.uniform(0.8, 1.2),
                            "Q2": random.uniform(0.9, 1.1),
                            "Q3": random.uniform(0.85, 1.15),
                            "Q4": random.uniform(1.0, 1.3),
                        },
                    )
                    trends.append(trend)

        # Sort by growth rate descending
        trends.sort(key=lambda t: t.growth_rate, reverse=True)
        return trends[:20]

    async def _find_creators(
        self, request: OpportunityDiscoveryRequest, trends: List[TrendData]
    ) -> List[CreatorData]:
        """Find successful creators in the niche."""
        creators = []
        niches = [request.niche] if request.niche else self.NICHES[:5]

        for platform in request.platforms:
            for i, niche in enumerate(niches):
                # Generate 2-3 creators per niche per platform
                for j in range(random.randint(2, 3)):
                    sub_count = random.randint(50000, 5000000)
                    avg_views = int(sub_count * random.uniform(0.05, 0.3))
                    engagement = random.uniform(0.02, 0.15)

                    creator = CreatorData(
                        creator_id=f"{platform.value}_{niche.replace(' ', '_')}_{j}",
                        name=f"{niche.title()} Creator {j+1}",
                        platform=platform,
                        subscriber_count=sub_count,
                        avg_views=avg_views,
                        engagement_rate=round(engagement, 4),
                        content_niche=[niche, random.choice(self.NICHES)],
                        recent_videos=[
                            {
                                "title": f"How to {trend.keyword.split(': ')[-1]} in 2024",
                                "views": int(avg_views * random.uniform(0.5, 1.5)),
                                "published_days_ago": random.randint(1, 30),
                            }
                            for trend in trends[:3]
                        ],
                        growth_trend=round(random.uniform(-0.1, 0.5), 3),
                    )
                    creators.append(creator)

        return creators

    async def _analyze_competitors(
        self, request: OpportunityDiscoveryRequest, trends: List[TrendData]
    ) -> List[CompetitorData]:
        """Analyze competing content for the identified trends."""
        competitors = []

        for trend in trends[:10]:
            # Generate 3-5 competitor videos per trend
            for i in range(random.randint(3, 5)):
                views = random.randint(10000, 2000000)
                likes = int(views * random.uniform(0.02, 0.08))
                comments = int(views * random.uniform(0.001, 0.01))
                shares = int(views * random.uniform(0.0005, 0.005))
                engagement = (likes + comments + shares) / views if views > 0 else 0

                competitor = CompetitorData(
                    video_id=f"comp_{trend.platform.value}_{trend.keyword.replace(' ', '_')}_{i}",
                    title=f"{trend.keyword}: Complete Guide 2024",
                    creator=f"Expert {i+1}",
                    platform=trend.platform,
                    views=views,
                    likes=likes,
                    comments=comments,
                    shares=shares,
                    published_at=datetime.utcnow() - timedelta(days=random.randint(1, 90)),
                    duration=random.randint(180, 1800),
                    tags=[trend.keyword, "tutorial", "guide", "2024", "tips"],
                    thumbnail_url=f"https://img.youtube.com/vi/comp_{i}/maxresdefault.jpg",
                    engagement_rate=round(engagement, 4),
                )
                competitors.append(competitor)

        return competitors

    async def _find_reference_videos(
        self,
        request: OpportunityDiscoveryRequest,
        trends: List[TrendData],
        creators: List[CreatorData],
    ) -> List[ReferenceVideo]:
        """Find high-quality reference videos for each opportunity."""
        references = []

        for trend in trends[:10]:
            # Get top creators for this platform
            platform_creators = [c for c in creators if c.platform == trend.platform]

            for i in range(random.randint(2, 4)):
                creator = random.choice(platform_creators) if platform_creators else None
                views = random.randint(50000, 1000000)
                engagement = random.uniform(0.03, 0.12)

                reference = ReferenceVideo(
                    video_id=f"ref_{trend.platform.value}_{trend.keyword.replace(' ', '_')}_{i}",
                    title=f"Mastering {trend.keyword} - Full Tutorial",
                    url=f"https://{trend.platform.value}.com/watch?v=ref_{i}",
                    platform=trend.platform,
                    creator=creator.name if creator else f"Reference Creator {i+1}",
                    views=views,
                    engagement_rate=round(engagement, 4),
                    published_at=datetime.utcnow() - timedelta(days=random.randint(7, 180)),
                    relevance_score=round(random.uniform(0.7, 0.95), 2),
                    why_relevant=f"High engagement on {trend.keyword}, covers key techniques",
                )
                references.append(reference)

        return references

    async def _generate_opportunities(
        self,
        request: OpportunityDiscoveryRequest,
        trends: List[TrendData],
        creators: List[CreatorData],
        competitors: List[CompetitorData],
        reference_videos: List[ReferenceVideo],
    ) -> List[DiscoveredOpportunity]:
        """Generate content opportunities from research data."""
        opportunities = []

        # Group trends by niche
        niches = [request.niche] if request.niche else self.NICHES[:5]

        for niche in niches:
            niche_trends = [t for t in trends if niche.lower() in t.keyword.lower()]
            if not niche_trends:
                niche_trends = trends[:3]

            niche_competitors = competitors[:5]
            niche_references = reference_videos[:5]
            niche_creators = [c for c in creators if niche.lower() in str(c.content_niche).lower()]

            # Create 2-3 opportunities per niche
            for i in range(random.randint(2, 3)):
                top_trend = niche_trends[i] if i < len(niche_trends) else niche_trends[0]

                opportunity = DiscoveredOpportunity(
                    title=f"{niche.title()}: {top_trend.keyword.split(': ')[-1].title()} Deep Dive",
                    topic_description=(
                        f"Comprehensive coverage of {top_trend.keyword} targeting {request.audience or 'general audience'}. "
                        f"Based on {top_trend.growth_rate}% trend growth on {top_trend.platform.value}."
                    ),
                    target_audience=request.audience or f"{niche} enthusiasts",
                    audience_need=f"Practical, actionable guidance on {top_trend.keyword} with real examples",
                    market_evidence={
                        "trend_growth": top_trend.growth_rate,
                        "search_volume": top_trend.search_volume,
                        "platform": top_trend.platform.value,
                        "competitor_count": len(niche_competitors),
                    },
                    relevant_trends=niche_trends[:3],
                    competing_content=niche_competitors,
                    reference_videos=niche_references,
                    relevant_creators=niche_creators[:3],
                    performance_data={
                        "avg_views": sum(c.views for c in niche_competitors) / len(niche_competitors) if niche_competitors else 0,
                        "avg_engagement": sum(c.engagement_rate for c in niche_competitors) / len(niche_competitors) if niche_competitors else 0,
                    },
                    audience_reactions={
                        "common_questions": [
                            f"How to get started with {top_trend.keyword}?",
                            f"Best tools for {top_trend.keyword}?",
                            f"Common mistakes in {top_trend.keyword}?",
                        ],
                        "pain_points": [
                            "Overwhelming information",
                            "Lack of practical examples",
                            "Outdated tutorials",
                        ],
                        "desired_formats": [f.value for f in request.content_types] or ["tutorial", "case study", "comparison"],
                    },
                    creative_formats=request.content_types or [
                        CreativeFormat.EDUCATIONAL,
                        CreativeFormat.MOTION_GRAPHICS,
                        CreativeFormat.WHITEBOARD,
                    ],
                    potential_hooks=[
                        f"Why 90% fail at {top_trend.keyword}",
                        f"The {top_trend.keyword} secret experts don't share",
                        f"I tried {top_trend.keyword} for 30 days - here's what happened",
                        f"Stop making this {top_trend.keyword} mistake",
                    ],
                    risks=[
                        "High competition in niche",
                        "Algorithm changes may affect reach",
                        "Topic may become saturated quickly",
                        "Requires deep expertise to execute well",
                    ],
                    confidence_level=round(random.uniform(0.65, 0.9), 2),
                    recommended_actions=[
                        f"Create {request.content_types[0].value if request.content_types else 'educational'} series on {top_trend.keyword}",
                        "Research top 10 competitor videos for content gaps",
                        "Develop unique angle or framework",
                        "Plan hook variations for testing",
                        "Set up tracking for performance metrics",
                    ],
                    ranking=OpportunityRanking(
                        market_interest=0.0,
                        trend_momentum=0.0,
                        audience_relevance=0.0,
                        content_saturation=0.0,
                        reference_quality=0.0,
                        creative_potential=0.0,
                        production_feasibility=0.0,
                        overall_score=0.0,
                    ),
                )
                opportunities.append(opportunity)

        return opportunities

    def _rank_opportunities(
        self, opportunities: List[DiscoveredOpportunity], request: OpportunityDiscoveryRequest
    ) -> List[DiscoveredOpportunity]:
        """Rank opportunities using multiple independent dimensions."""

        for opp in opportunities:
            # Market Interest: based on search volume and trend growth
            market_interest = min(1.0, opp.market_evidence.get("search_volume", 10000) / 500000)
            market_interest = (market_interest + min(1.0, opp.market_evidence.get("trend_growth", 20) / 100)) / 2

            # Trend Momentum: based on growth rate
            trend_momentum = min(1.0, max(0, opp.market_evidence.get("trend_growth", 20)) / 100)

            # Audience Relevance: based on confidence level and niche match
            audience_relevance = opp.confidence_level

            # Content Saturation: inverse of competitor density (lower saturation = better)
            competitor_count = opp.market_evidence.get("competitor_count", 5)
            content_saturation = 1.0 - min(1.0, competitor_count / 20)

            # Reference Quality: average relevance score of reference videos
            ref_scores = [r.relevance_score for r in opp.reference_videos]
            reference_quality = sum(ref_scores) / len(ref_scores) if ref_scores else 0.5

            # Creative Potential: based on number of creative formats and hooks
            creative_potential = min(1.0, (len(opp.creative_formats) + len(opp.potential_hooks)) / 10)

            # Production Feasibility: inverse of risks count
            production_feasibility = 1.0 - min(1.0, len(opp.risks) / 10)

            # Weighted overall score
            weights = {
                "market_interest": 0.20,
                "trend_momentum": 0.15,
                "audience_relevance": 0.20,
                "content_saturation": 0.15,
                "reference_quality": 0.10,
                "creative_potential": 0.10,
                "production_feasibility": 0.10,
            }

            overall_score = (
                market_interest * weights["market_interest"] +
                trend_momentum * weights["trend_momentum"] +
                audience_relevance * weights["audience_relevance"] +
                content_saturation * weights["content_saturation"] +
                reference_quality * weights["reference_quality"] +
                creative_potential * weights["creative_potential"] +
                production_feasibility * weights["production_feasibility"]
            )

            opp.ranking = OpportunityRanking(
                market_interest=round(market_interest, 3),
                trend_momentum=round(trend_momentum, 3),
                audience_relevance=round(audience_relevance, 3),
                content_saturation=round(content_saturation, 3),
                reference_quality=round(reference_quality, 3),
                creative_potential=round(creative_potential, 3),
                production_feasibility=round(production_feasibility, 3),
                overall_score=round(overall_score, 3),
            )

        # Sort by overall score descending
        opportunities.sort(key=lambda o: o.ranking.overall_score, reverse=True)
        return opportunities

    async def _store_opportunities(
        self, project_id: str, opportunities: List[DiscoveredOpportunity]
    ) -> List[Opportunity]:
        """Store discovered opportunities in database."""
        stored = []
        for opp in opportunities:
            db_opp = Opportunity(
                project_id=project_id,
                title=opp.title,
                topic_description=opp.topic_description,
                target_audience=opp.target_audience,
                audience_need=opp.audience_need,
                market_evidence=opp.market_evidence,
                relevant_trends=[t.model_dump() for t in opp.relevant_trends],
                competing_content=[c.model_dump() for c in opp.competing_content],
                reference_videos=[r.model_dump() for r in opp.reference_videos],
                relevant_creators=[c.model_dump() for c in opp.relevant_creators],
                performance_data=opp.performance_data,
                audience_reactions=opp.audience_reactions,
                creative_formats=[DBCreativeFormat(f.value) for f in opp.creative_formats],
                potential_hooks=opp.potential_hooks,
                risks=opp.risks,
                confidence_level=opp.confidence_level,
                recommended_actions=opp.recommended_actions,
                status=OpportunityStatus.DISCOVERED,
                rank_scores=opp.ranking.model_dump(),
            )
            self.db.add(db_opp)
            stored.append(db_opp)

        await self.db.commit()
        for opp in stored:
            await self.db.refresh(opp)

        return stored