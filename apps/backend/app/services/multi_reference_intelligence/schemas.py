from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


class CommonPattern(BaseModel):
    pattern_type: str  # visual, hook, narrative, editing, animation, emotional
    pattern_name: str
    description: str
    frequency: int  # how many references have this pattern
    reference_indices: List[int]  # which references (by index) have this pattern
    confidence: float = Field(ge=0.0, le=1.0)
    examples: List[Dict[str, Any]] = []


class SharedCreativeDNA(BaseModel):
    core_patterns: List[CommonPattern]
    dominant_hooks: List[str]
    narrative_structure: str
    visual_style_signature: Dict[str, Any]
    editing_rhythm: Dict[str, Any]
    emotional_arc: Dict[str, Any]
    animation_style: Dict[str, Any]
    color_palette: List[str]
    sound_signature: Dict[str, Any]


class StyleProfile(BaseModel):
    visual_style: str
    color_palette: List[str]
    composition_rules: List[str]
    camera_style: str
    lighting_style: str
    animation_style: str
    editing_pace: str
    transition_style: str


class StorytellingProfile(BaseModel):
    narrative_structure: str  # e.g., "hero's journey", "problem-solution", "listicle"
    hook_types: List[str]
    emotional_arc: Dict[str, float]  # emotion -> intensity over time
    pacing_pattern: str
    cta_strategy: str
    payoff_delivery: str


class TransferPrinciple(BaseModel):
    principle_name: str
    description: str
    source_pattern: str
    target_application: str
    confidence: float
    prerequisites: List[str]
    examples: List[Dict[str, Any]]


class PerformanceComparison(BaseModel):
    reference_index: int
    reference_id: str
    title: str
    views: int
    engagement_rate: float
    completion_rate: float
    strong_elements: List[str]
    weak_elements: List[str]


class MultiReferenceAnalysisRequest(BaseModel):
    project_id: UUID
    reference_ids: List[str]
    analysis_focus: List[str] = Field(default=[
        "creative_dna", "style_profile", "storytelling_profile",
        "transfer_principles", "performance_comparison"
    ])
    min_pattern_frequency: int = Field(default=2, ge=1)
    min_confidence: float = Field(default=0.7, ge=0.0, le=1.0)


class SharedCreativeDNAResponse(BaseModel):
    dna: SharedCreativeDNA
    style_profile: StyleProfile
    storytelling_profile: StorytellingProfile
    transfer_principles: List[TransferPrinciple]
    performance_comparison: List[PerformanceComparison]
    creative_outliers: List[Dict[str, Any]]


class MultiReferenceAnalysisResponse(BaseModel):
    id: str
    project_id: str
    reference_ids: List[str]
    shared_dna: SharedCreativeDNA
    style_profile: StyleProfile
    storytelling_profile: StorytellingProfile
    transfer_principles: List[TransferPrinciple]
    performance_comparison: List[PerformanceComparison]
    creative_outliers: List[Dict[str, Any]]
    status: str
    progress: float = Field(default=0.0, ge=0.0, le=100.0)
    created_at: datetime
    updated_at: datetime