from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, DateTime, func, ForeignKey, Enum as SQLEnum, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum

from app.db.session import Base


class AnalysisType(str, enum.Enum):
    SCENE = "SCENE"
    FRAME = "FRAME"
    COMPOSITION = "COMPOSITION"
    CAMERA = "CAMERA"
    VISUAL_HIERARCHY = "VISUAL_HIERARCHY"
    COLOR_LIGHTING = "COLOR_LIGHTING"
    OBJECTS_CHARACTERS = "OBJECTS_CHARACTERS"
    EXPRESSIONS = "EXPRESSIONS"
    TRANSITIONS = "TRANSITIONS"
    VISUAL_EFFECTS = "VISUAL_EFFECTS"
    OCR = "OCR"
    HEADLINES = "HEADLINES"
    CAPTIONS = "CAPTIONS"
    SUBTITLES = "SUBTITLES"
    ANIMATED_TYPOGRAPHY = "ANIMATED_TYPOGRAPHY"
    TEXT_POSITION = "TEXT_POSITION"
    SPEECH_TRANSCRIPTION = "SPEECH_TRANSCRIPTION"
    VOICEOVER = "VOICEOVER"
    DIALOGUE = "DIALOGUE"
    SPEAKER_IDENTIFICATION = "SPEAKER_IDENTIFICATION"
    SPEECH_SPEED = "SPEECH_SPEED"
    TONE = "TONE"
    PAUSES = "PAUSES"
    MUSIC = "MUSIC"
    SOUND_EFFECTS = "SOUND_EFFECTS"
    RHYTHM = "RHYTHM"
    HOOKS = "HOOKS"
    STORYTELLING = "STORYTELLING"
    CURIOSITY_LOOPS = "CURIOSITY_LOOPS"
    EMOTIONAL_TRIGGERS = "EMOTIONAL_TRIGGERS"
    NARRATIVE_STRUCTURE = "NARRATIVE_STRUCTURE"
    ANIMATION = "ANIMATION"
    MOTION_GRAPHICS = "MOTION_GRAPHICS"
    EDITING = "EDITING"
    TIMING = "TIMING"
    PACING = "PACING"
    CTAS = "CTAS"
    PAYOFFS = "PAYOFFS"


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reference_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("references.id", ondelete="CASCADE"), nullable=False, index=True
    )
    analysis_type: Mapped[AnalysisType] = mapped_column(SQLEnum(AnalysisType), nullable=False)
    findings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    evidence: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    interpretations: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    confidence_level: Mapped[float] = mapped_column(Float, nullable=False)
    creative_applications: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    timestamped_report: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    project: Mapped["Project"] = relationship("Project", back_populates="investigations")
    reference: Mapped["Reference"] = relationship("Reference", back_populates="investigations")