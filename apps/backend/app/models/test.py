from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, func, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum

from app.db.session import Base


class TestType(str, enum.Enum):
    HOOK_ALTERNATIVE = "HOOK_ALTERNATIVE"
    OPENING_SCENE = "OPENING_SCENE"
    SCRIPT_ALTERNATIVE = "SCRIPT_ALTERNATIVE"
    VOICEOVER_ALTERNATIVE = "VOICEOVER_ALTERNATIVE"
    NARRATIVE_APPROACH = "NARRATIVE_APPROACH"
    ANIMATION_VARIATION = "ANIMATION_VARIATION"
    DURATION_COMPARISON = "DURATION_COMPARISON"
    VISUAL_CONSISTENCY = "VISUAL_CONSISTENCY"
    AUDIO_QUALITY = "AUDIO_QUALITY"
    SUBTITLE_VERIFICATION = "SUBTITLE_VERIFICATION"


class Test(Base):
    __tablename__ = "tests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    production_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("productions.id", ondelete="SET NULL"), nullable=True
    )
    test_type: Mapped[TestType] = mapped_column(SQLEnum(TestType), nullable=False)
    variants: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    results: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    quality_assessment: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    performance_hypothesis: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    audience_experiment: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    project: Mapped["Project"] = relationship("Project", back_populates="tests")
    production: Mapped["Production | None"] = relationship("Production", back_populates="tests")