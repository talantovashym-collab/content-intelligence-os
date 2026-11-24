from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from uuid import UUID


class AnalysisType(str, Enum):
    """Types of media analysis available."""
    SCENE = "scene"
    FRAME = "frame"
    COMPOSITION = "composition"
    CAMERA = "camera"
    VISUAL_HIERARCHY = "visual_hierarchy"
    COLOR_LIGHTING = "color_lighting"
    OBJECTS_CHARACTERS = "objects_characters"
    EXPRESSIONS = "expressions"
    TRANSITIONS = "transitions"
    VISUAL_EFFECTS = "visual_effects"
    OCR = "ocr"
    HEADLINES = "headlines"
    CAPTIONS = "captions"
    SUBTITLES = "subtitles"
    ANIMATED_TYPOGRAPHY = "animated_typography"
    TEXT_POSITION = "text_position"
    SPEECH_TRANSCRIPTION = "speech_transcription"
    VOICEOVER = "voiceover"
    DIALOGUE = "dialogue"
    SPEAKER_IDENTIFICATION = "speaker_identification"
    SPEECH_SPEED = "speech_speed"
    TONE = "tone"
    PAUSES = "pauses"
    MUSIC = "music"
    SOUND_EFFECTS = "sound_effects"
    RHYTHM = "rhythm"
    HOOKS = "hooks"
    STORYTELLING = "storytelling"
    CURIOSITY_LOOPS = "curiosity_loops"
    EMOTIONAL_TRIGGERS = "emotional_triggers"
    NARRATIVE_STRUCTURE = "narrative_structure"
    ANIMATION = "animation"
    MOTION_GRAPHICS = "motion_graphics"
    EDITING = "editing"
    TIMING = "timing"
    PACING = "pacing"
    CTAS = "ctas"
    PAYOFFS = "payoffs"


class FrameExtractionConfig(BaseModel):
    interval_seconds: float = Field(default=1.0, ge=0.1, le=60.0)
    max_frames: int = Field(default=500, ge=1, le=5000)
    target_width: int = Field(default=640, ge=160, le=1920)
    format: str = Field(default="jpg", pattern="^(jpg|png|webp)$")
    quality: int = Field(default=85, ge=10, le=100)


class SceneDetectionConfig(BaseModel):
    threshold: float = Field(default=0.3, ge=0.01, le=1.0)
    min_scene_length: float = Field(default=0.5, ge=0.1, le=10.0)
    detector: str = Field(default="content", pattern="^(content|threshold|adaptive)$")


class OCRConfig(BaseModel):
    languages: List[str] = Field(default=["eng"])
    confidence_threshold: float = Field(default=0.7, ge=0.1, le=1.0)
    extract_bounding_boxes: bool = True
    detect_orientation: bool = True


class AudioTranscriptionConfig(BaseModel):
    model: str = Field(default="whisper-base", pattern="^(whisper-tiny|whisper-base|whisper-small|whisper-medium|whisper-large)$")
    language: Optional[str] = None
    detect_speakers: bool = True
    detect_pauses: bool = True
    punctuation: bool = True


class CreativeAnalysisConfig(BaseModel):
    analyze_hooks: bool = True
    analyze_storytelling: bool = True
    analyze_emotional_triggers: bool = True
    analyze_narrative_structure: bool = True
    analyze_animation: bool = True
    analyze_editing: bool = True
    analyze_timing_pacing: bool = True
    analyze_ctas: bool = True
    analyze_payoffs: bool = True


class MediaEngineeringRequest(BaseModel):
    reference_id: UUID
    analysis_types: List[AnalysisType]
    frame_extraction: Optional[FrameExtractionConfig] = None
    scene_detection: Optional[SceneDetectionConfig] = None
    ocr: Optional[OCRConfig] = None
    audio_transcription: Optional[AudioTranscriptionConfig] = None
    creative_analysis: Optional[CreativeAnalysisConfig] = None
    priority: int = Field(default=1, ge=1, le=10)


class MediaEngineeringResponse(BaseModel):
    id: UUID
    reference_id: UUID
    analysis_types: List[str]
    status: str  # pending, processing, completed, failed
    progress: float = Field(default=0.0, ge=0.0, le=100.0)
    results: Dict[str, Any] = {}
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class FrameAnalysisResult(BaseModel):
    frame_number: int
    timestamp: float
    image_path: Optional[str] = None
    ocr_text: Optional[str] = None
    objects_detected: List[Dict[str, Any]] = []
    composition_analysis: Optional[Dict[str, Any]] = None
    color_analysis: Optional[Dict[str, Any]] = None
    lighting_analysis: Optional[Dict[str, Any]] = None


class SceneAnalysisResult(BaseModel):
    scene_number: int
    start_time: float
    end_time: float
    duration: float
    frame_indices: List[int]
    description: Optional[str] = None
    camera_movement: Optional[str] = None
    transition_type: Optional[str] = None


class AudioSegmentResult(BaseModel):
    segment_id: str
    start_time: float
    end_time: float
    speaker_id: Optional[str] = None
    text: str
    confidence: float
    is_pause: bool = False
    music_detected: bool = False
    sound_effects: List[str] = []


class CreativeTechniqueResult(BaseModel):
    hook_type: Optional[str] = None
    hook_timestamp: Optional[float] = None
    storytelling_structure: Optional[str] = None
    emotional_triggers: List[str] = []
    narrative_arc: Optional[Dict[str, float]] = None
    animation_techniques: List[str] = []
    editing_patterns: List[str] = []
    timing_analysis: Optional[Dict[str, Any]] = None
    cta_locations: List[float] = []
    payoff_moments: List[Dict[str, Any]] = []