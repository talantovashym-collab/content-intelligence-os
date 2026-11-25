from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import uuid
from datetime import datetime


class CreativeStrategyGenerationRequest(BaseModel):
    """Request to generate a creative strategy from research data."""
    project_id: uuid.UUID
    concept: str = Field(..., min_length=10, max_length=5000, description="Core concept/idea")
    topic: str = Field(..., min_length=3, max_length=200, description="Topic/niche")
    target_audience: str = Field(..., min_length=10, max_length=2000, description="Target audience description")
    research_context: Optional[Dict[str, Any]] = Field(default=None, description="Research findings from Modules 1-5")
    reference_dna: Optional[Dict[str, Any]] = Field(default=None, description="Multi-reference DNA from Module 5")
    platform_targets: Optional[List[str]] = Field(default=["youtube", "tiktok", "instagram"], description="Target platforms")
    duration_preference: Optional[int] = Field(default=60, description="Preferred duration in seconds")
    tone: Optional[str] = Field(default="engaging", description="Tone/style preference")
    format_preference: Optional[str] = Field(default="educational", description="Format preference")


class CreativeStrategyApprovalRequest(BaseModel):
    """Request to approve/reject a creative strategy."""
    strategy_id: uuid.UUID
    approved: bool
    feedback: Optional[str] = None


class CreativeStrategyGenerationResponse(BaseModel):
    """Response with generated creative strategy."""
    strategy_id: uuid.UUID
    concept: str
    topic: str
    target_audience: str
    creative_angle: str
    core_message: str
    emotional_objective: str
    hook_direction: str
    narrative_formula: str
    visual_style: str
    animation_style: str
    duration: int
    platform_adaptations: Dict[str, Any]
    differentiation: str
    alternatives: Dict[str, Any]
    is_approved: bool
    created_at: datetime


class CreativeStrategyDraft(BaseModel):
    """Draft strategy for review before saving."""
    creative_angle: str
    core_message: str
    emotional_objective: str
    hook_direction: str
    narrative_formula: str
    visual_style: str
    animation_style: str
    duration: int
    platform_adaptations: Dict[str, Any]
    differentiation: str
    alternatives: Dict[str, Any]


class StrategyGenerationOptions(BaseModel):
    """Options for strategy generation."""
    use_openai: bool = True
    use_anthropic: bool = True
    llm_model: str = "gpt-4o"
    anthropic_model: str = "claude-sonnet-5-5"
    temperature: float = 0.7
    max_tokens: int = 4000