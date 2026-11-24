from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime
from enum import Enum
from uuid import UUID


class MediaType(str, Enum):
    VIDEO = "video"
    AUDIO = "audio"
    IMAGE = "image"
    DOCUMENT = "document"


class ReferenceStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    DOWNLOADED = "downloaded"
    INDEXING = "indexing"
    INDEXED = "indexed"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    FAILED = "failed"
    ARCHIVED = "archived"


class Platform(str, Enum):
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"


class ReferenceCaptureRequest(BaseModel):
    source_url: HttpUrl
    source_platform: Optional[Platform] = None
    title: Optional[str] = None
    description: Optional[str] = None
    media_type: MediaType = MediaType.VIDEO
    project_id: UUID
    auto_analyze: bool = True
    analysis_types: List[str] = []


class BatchCaptureRequest(BaseModel):
    references: List[ReferenceCaptureRequest]
    project_id: UUID
    auto_analyze: bool = True


class ReferenceCaptureResponse(BaseModel):
    id: UUID
    project_id: UUID
    source_url: str
    source_platform: Optional[Platform]
    title: str
    description: Optional[str]
    media_type: MediaType
    media_url: Optional[str]
    local_path: Optional[str]
    thumbnail_url: Optional[str]
    duration: Optional[float]
    published_at: Optional[datetime]
    engagement_metrics: Dict[str, Any]
    hashtags: List[str]
    captions: Optional[str]
    status: ReferenceStatus
    metadata: Dict[str, Any]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime


class BatchCaptureResponse(BaseModel):
    successful: List[ReferenceCaptureResponse]
    failed: List[Dict[str, Any]]
    total: int
    successful_count: int
    failed_count: int


class ReferenceStatusUpdate(BaseModel):
    status: ReferenceStatus
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None