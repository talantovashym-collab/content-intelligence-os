from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class Platform(str, Enum):
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"


class CreativeFormat(str, Enum):
    STICKMAN = "stickman"
    DOODLE = "doodle"
    WHITEBOARD = "whiteboard"
    CARTOON = "cartoon"
    MOTION_GRAPHICS = "motion_graphics"
    CINEMATIC = "cinematic"
    DOCUMENTARY = "documentary"
    EDUCATIONAL = "educational"


class TrendData(BaseModel):
    keyword: str
    platform: Platform
    search_volume: int
    growth_rate: float  # percentage
    related_keywords: List[str] = []
    geographic_interest: Dict[str, int] = {}
    seasonal_pattern: Optional[Dict[str, float]] = None


class CreatorData(BaseModel):
    creator_id: str
    name: str
    platform: Platform
    subscriber_count: int
    avg_views: int
    engagement_rate: float
    content_niche: List[str]
    recent_videos: List[Dict[str, Any]] = []
    growth_trend: float


class CompetitorData(BaseModel):
    video_id: str
    title: str
    creator: str
    platform: Platform
    views: int
    likes: int
    comments: int
    shares: int
    published_at: datetime
    duration: int
    tags: List[str]
    thumbnail_url: Optional[str] = None
    engagement_rate: float


class ReferenceVideo(BaseModel):
    video_id: str
    title: str
    url: str
    platform: Platform
    creator: str
    views: int
    engagement_rate: float
    published_at: datetime
    relevance_score: float
    why_relevant: str


class OpportunityRanking(BaseModel):
    market_interest: float = Field(ge=0, le=1, description="Market interest score 0-1")
    trend_momentum: float = Field(ge=0, le=1, description="Trend momentum score 0-1")
    audience_relevance: float = Field(ge=0, le=1, description="Audience relevance score 0-1")
    content_saturation: float = Field(ge=0, le=1, description="Content saturation score 0-1 (lower is better)")
    reference_quality: float = Field(ge=0, le=1, description="Reference quality score 0-1")
    creative_potential: float = Field(ge=0, le=1, description="Creative potential score 0-1")
    production_feasibility: float = Field(ge=0, le=1, description="Production feasibility score 0-1")
    overall_score: float = Field(ge=0, le=1, description="Weighted overall score")


class DiscoveredOpportunity(BaseModel):
    title: str
    topic_description: str
    target_audience: str
    audience_need: str
    market_evidence: Dict[str, Any]
    relevant_trends: List[TrendData]
    competing_content: List[CompetitorData]
    reference_videos: List[ReferenceVideo]
    relevant_creators: List[CreatorData]
    performance_data: Dict[str, Any]
    audience_reactions: Dict[str, Any]
    creative_formats: List[CreativeFormat]
    potential_hooks: List[str]
    risks: List[str]
    confidence_level: float = Field(ge=0, le=1)
    recommended_actions: List[str]
    ranking: OpportunityRanking


class OpportunityDiscoveryRequest(BaseModel):
    niche: Optional[str] = None
    audience: Optional[str] = None
    language: str = "en"
    country: str = "US"
    platforms: List[Platform] = [Platform.YOUTUBE]
    date_range_days: int = 30
    content_types: List[CreativeFormat] = []
    creator_size_min: Optional[int] = None
    creator_size_max: Optional[int] = None
    min_engagement_rate: float = 0.02
    max_results: int = 20
    include_competitor_analysis: bool = True
    include_trend_analysis: bool = True


class OpportunityDiscoveryResponse(BaseModel):
    opportunities: List[DiscoveredOpportunity]
    total_analyzed: int
    search_metadata: Dict[str, Any]
    generated_at: datetime = Field(default_factory=datetime.utcnow)