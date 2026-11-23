from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, DateTime, func, ForeignKey, Enum as SQLEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import uuid
import enum

from app.db.session import Base


class CreativeFormat(str, enum.Enum):
    STICKMAN = "STICKMAN"
    DOODLE = "DOODLE"
    WHITEBOARD = "WHITEBOARD"
    CARTOON = "CARTOON"
    MOTION_GRAPHICS = "MOTION_GRAPHICS"
    CINEMATIC = "CINEMATIC"
    DOCUMENTARY = "DOCUMENTARY"
    EDUCATIONAL = "EDUCATIONAL"


class Production(Base):
    __tablename__ = "productions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    strategy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("creative_strategies.id", ondelete="CASCADE"), nullable=False
    )
    format: Mapped[CreativeFormat] = mapped_column(SQLEnum(CreativeFormat), nullable=False)
    script: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    hooks: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    voiceover: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    storyboard: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    character_designs: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    animation_instructions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    visual_prompts: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    image_assets: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    video_assets: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    sound_design: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    music_direction: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    editing_instructions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    captions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    subtitles: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    timeline: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    project: Mapped["Project"] = relationship("Project", back_populates="productions")
    strategy: Mapped["CreativeStrategy"] = relationship("CreativeStrategy", back_populates="productions")
    tests: Mapped[list["Test"]] = relationship(
        "Test", back_populates="production", cascade="all, delete-orphan"
    )