"""Ownership checks shared by the project-scoped routers.

Every item hangs off a project and every project belongs to one user. These helpers
answer 404 for anything outside the signed-in user's projects, so another user's IDs
look exactly like IDs that do not exist.
"""
import uuid
from typing import Type, TypeVar

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.user import User

M = TypeVar("M")


async def owned_project(db: AsyncSession, project_id: uuid.UUID, user: User) -> Project:
    """The project, if it belongs to user; 404 otherwise."""
    project = await db.scalar(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


async def owned_item(
    db: AsyncSession, model: Type[M], item_id: uuid.UUID, project_id: uuid.UUID, user: User, label: str
) -> M:
    """An item of model that lives in project_id AND in a project owned by user; 404 otherwise."""
    item = await db.scalar(
        select(model)
        .join(Project, Project.id == model.project_id)
        .where(model.id == item_id, model.project_id == project_id, Project.user_id == user.id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found")
    return item


async def item_in_project(db: AsyncSession, model: Type[M], item_id: uuid.UUID, project_id: uuid.UUID, label: str) -> M:
    """A row another item links to (a publication, a reference, ...) must sit in the same project.

    Call it only after the project's ownership has been checked.
    """
    item = await db.scalar(select(model).where(model.id == item_id, model.project_id == project_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found in this project")
    return item
