from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, DateTime, func, ForeignKey, Enum as SQLEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.db.session import Base


class CreativeStrategy(Base):
    __tablename__ = "creative_strategies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    concept: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[str] = mapped_column(String(500), nullable=False)
    target_audience: Mapped[str] = mapped_column(Text, nullable=False)
    creative_angle: Mapped[str] = mapped_column(Text, nullable=False)
    core_message: Mapped[str] = mapped_column(Text, nullable=False)
    emotional_objective: Mapped[str] = mapped_column(Text, nullable=False)
    hook_direction: Mapped[str] = mapped_column(Text, nullable=False)
    narrative_formula: Mapped[str] = mapped_column(Text, nullable=False)
    visual_style: Mapped[str] = mapped_column(Text, nullable=False)
    animation_style: Mapped[str] = mapped_column(Text, nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)
    platform_adaptations: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    differentiation: Mapped[str] = mapped_column(Text, nullable=False)
    alternatives: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    is_approved: Mapped[bool] = mapped_column(default=False, nullable=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Reviewer's note from the most recent approve/reject decision
    approval_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    project: Mapped["Project"] = relationship("Project", back_populates="strategies")
    productions: Mapped[list["Production"]] = relationship(
        "Production", back_populates="strategy", cascade="all, delete-orphan"
    )