from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import uuid
from datetime import datetime


class ProductionGenerationRequest(BaseModel):
    """Request to generate production assets from an approved strategy."""
    strategy_id: uuid.UUID
    format: str = Field(..., description="Creative format (STICKMAN, DOODLE, WHITEBOARD, CARTOON, MOTION_GRAPHICS, CINEMATIC, DOCUMENTARY, EDUCATIONAL)")
    platform_targets: Optional[List[str]] = Field(default=["youtube", "tiktok", "instagram"])
    custom_requirements: Optional[Dict[str, Any]] = Field(default=None)


class ProductionGenerationResponse(BaseModel):
    """Response with generated production assets."""
    production_id: uuid.UUID
    strategy_id: uuid.UUID
    format: str
    script: Dict[str, Any]
    hooks: Dict[str, Any]
    voiceover: Dict[str, Any]
    storyboard: Dict[str, Any]
    character_designs: Dict[str, Any]
    animation_instructions: Dict[str, Any]
    visual_prompts: Dict[str, Any]
    image_assets: Dict[str, Any]
    video_assets: Dict[str, Any]
    sound_design: Dict[str, Any]
    music_direction: Dict[str, Any]
    editing_instructions: Dict[str, Any]
    captions: Dict[str, Any]
    subtitles: Dict[str, Any]
    timeline: Dict[str, Any]
    version: int
    status: str
    created_at: datetime


class ProductionAssetRequest(BaseModel):
    """Request to generate specific production assets."""
    production_id: uuid.UUID
    asset_type: str = Field(..., description="Type of asset: script, storyboard, voiceover, images, video, audio")
    parameters: Optional[Dict[str, Any]] = Field(default=None)


class ProductionAssetResponse(BaseModel):
    """Response with generated asset."""
    asset_id: str
    asset_type: str
    content: Dict[str, Any]
    generation_metadata: Dict[str, Any]
    status: str


class ProductionQueueItem(BaseModel):
    """Item in the production queue."""
    production_id: uuid.UUID
    project_id: uuid.UUID
    format: str
    status: str
    priority: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class ProductionExportRequest(BaseModel):
    """Request to export production package."""
    production_id: uuid.UUID
    export_format: str = Field(default="json", description="Export format: json, remotion, aftereffects, premiere")
    include_assets: bool = True


class ProductionExportResponse(BaseModel):
    """Response with export package."""
    export_id: str
    download_url: str
    format: str
    size_bytes: int
    expires_at: datetime