from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, DateTime, func, ForeignKey, Enum as SQLEnum, BigInteger, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum

from app.db.session import Base


class Platform(str, enum.Enum):
    YOUTUBE = "YOUTUBE"
    TIKTOK = "TIKTOK"
    INSTAGRAM = "INSTAGRAM"
    FACEBOOK = "FACEBOOK"
    TWITTER = "TWITTER"
    LINKEDIN = "LINKEDIN"


class Analytics(Base):
    __tablename__ = "analytics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    publication_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("publications.id", ondelete="CASCADE"), nullable=False
    )
    platform: Mapped[Platform] = mapped_column(SQLEnum(Platform), nullable=False)
    views: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    watch_time: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    retention: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    completion_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    likes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    shares: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    saves: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    follower_growth: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    engagement_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    performance_over_time: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    predicted_vs_actual: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    successful_elements: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    weak_points: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    improvement_opps: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    cross_platform_compare: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    collected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    project: Mapped["Project"] = relationship("Project", back_populates="analytics")