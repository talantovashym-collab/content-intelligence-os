from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, DateTime, func, ForeignKey, Enum as SQLEnum, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum

from app.db.session import Base


class ProjectStage(str, enum.Enum):
    IDEA = "IDEA"
    RESEARCH = "RESEARCH"
    REFERENCE_COLLECTION = "REFERENCE_COLLECTION"
    INVESTIGATION = "INVESTIGATION"
    CREATIVE_STRATEGY = "CREATIVE_STRATEGY"
    PRODUCTION = "PRODUCTION"
    TESTING = "TESTING"
    PUBLISHING = "PUBLISHING"
    PUBLISHED = "PUBLISHED"
    ANALYSIS = "ANALYSIS"
    COMPLETED = "COMPLETED"


class Platform(str, enum.Enum):
    YOUTUBE = "YOUTUBE"
    TIKTOK = "TIKTOK"
    INSTAGRAM = "INSTAGRAM"
    FACEBOOK = "FACEBOOK"
    TWITTER = "TWITTER"
    LINKEDIN = "LINKEDIN"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    stage: Mapped[ProjectStage] = mapped_column(
        SQLEnum(ProjectStage), default=ProjectStage.IDEA, nullable=False
    )
    niche: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_audience: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    country: Mapped[str] = mapped_column(String(10), default="US", nullable=False)
    platforms: Mapped[List[Platform]] = mapped_column(
        ARRAY(SQLEnum(Platform)), default=list, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="projects")
    opportunities: Mapped[list["Opportunity"]] = relationship(
        "Opportunity", back_populates="project", cascade="all, delete-orphan"
    )
    references: Mapped[list["Reference"]] = relationship(
        "Reference", back_populates="project", cascade="all, delete-orphan"
    )
    investigations: Mapped[list["Investigation"]] = relationship(
        "Investigation", back_populates="project", cascade="all, delete-orphan"
    )
    strategies: Mapped[list["CreativeStrategy"]] = relationship(
        "CreativeStrategy", back_populates="project", cascade="all, delete-orphan"
    )
    productions: Mapped[list["Production"]] = relationship(
        "Production", back_populates="project", cascade="all, delete-orphan"
    )
    tests: Mapped[list["Test"]] = relationship(
        "Test", back_populates="project", cascade="all, delete-orphan"
    )
    publications: Mapped[list["Publication"]] = relationship(
        "Publication", back_populates="project", cascade="all, delete-orphan"
    )
    analytics: Mapped[list["Analytics"]] = relationship(
        "Analytics", back_populates="project", cascade="all, delete-orphan"
    )
    knowledge_entries: Mapped[list["KnowledgeEntry"]] = relationship(
        "KnowledgeEntry", back_populates="project", cascade="all, delete-orphan"
    )