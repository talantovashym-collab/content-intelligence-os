from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, DateTime, func, ForeignKey, Enum as SQLEnum, ARRAY, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum

from app.db.session import Base


class OpportunityStatus(str, enum.Enum):
    DISCOVERED = "DISCOVERED"
    RESEARCHING = "RESEARCHING"
    VALIDATED = "VALIDATED"
    REJECTED = "REJECTED"
    ARCHIVED = "ARCHIVED"


class CreativeFormat(str, enum.Enum):
    STICKMAN = "STICKMAN"
    DOODLE = "DOODLE"
    WHITEBOARD = "WHITEBOARD"
    CARTOON = "CARTOON"
    MOTION_GRAPHICS = "MOTION_GRAPHICS"
    CINEMATIC = "CINEMATIC"
    DOCUMENTARY = "DOCUMENTARY"
    EDUCATIONAL = "EDUCATIONAL"


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    topic_description: Mapped[str] = mapped_column(Text, nullable=False)
    target_audience: Mapped[str] = mapped_column(Text, nullable=False)
    audience_need: Mapped[str] = mapped_column(Text, nullable=False)
    market_evidence: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    relevant_trends: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    competing_content: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    reference_videos: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    relevant_creators: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    performance_data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    audience_reactions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    creative_formats: Mapped[List[CreativeFormat]] = mapped_column(
        ARRAY(SQLEnum(CreativeFormat)), default=list, nullable=False
    )
    potential_hooks: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    risks: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    confidence_level: Mapped[float] = mapped_column(Float, nullable=False)
    recommended_actions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[OpportunityStatus] = mapped_column(
        SQLEnum(OpportunityStatus), default=OpportunityStatus.DISCOVERED, nullable=False
    )
    rank_scores: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    project: Mapped["Project"] = relationship("Project", back_populates="opportunities")