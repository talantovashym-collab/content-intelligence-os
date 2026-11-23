from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.test import Test, TestType
from app.models.production import Production
from app.models.project import Project
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class TestBase(BaseModel):
    production_id: Optional[uuid.UUID] = None
    test_type: TestType
    variants: dict = {}
    results: dict = {}
    quality_assessment: dict = {}
    performance_hypothesis: dict = {}
    audience_experiment: dict = {}


class TestCreate(TestBase):
    pass


class TestUpdate(BaseModel):
    production_id: Optional[uuid.UUID] = None
    test_type: Optional[TestType] = None
    variants: Optional[dict] = None
    results: Optional[dict] = None
    quality_assessment: Optional[dict] = None
    performance_hypothesis: Optional[dict] = None
    audience_experiment: Optional[dict] = None
    status: Optional[str] = None


class TestResponse(TestBase):
    id: uuid.UUID
    project_id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TestListResponse(BaseModel):
    tests: List[TestResponse]
    total: int
    page: int
    page_size: int


@router.post("/{project_id}/tests", response_model=TestResponse, status_code=status.HTTP_201_CREATED)
async def create_test(
    project_id: uuid.UUID,
    test_data: TestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if test_data.production_id:
        result = await db.execute(
            select(Production).where(
                Production.id == test_data.production_id,
                Production.project_id == project_id
            )
        )
        production = result.scalar_one_or_none()
        if not production:
            raise HTTPException(status_code=404, detail="Production not found in this project")

    test = Test(
        project_id=project_id,
        **test_data.model_dump(),
    )
    db.add(test)
    await db.commit()
    await db.refresh(test)
    return test


@router.get("/{project_id}/tests", response_model=TestListResponse)
async def list_tests(
    project_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    test_type: Optional[TestType] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = select(Test).where(Test.project_id == project_id)
    if test_type:
        query = query.where(Test.test_type == test_type)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    query = query.order_by(Test.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    tests = result.scalars().all()

    return TestListResponse(
        tests=tests,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}/tests/{test_id}", response_model=TestResponse)
async def get_test(
    project_id: uuid.UUID,
    test_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Test)
        .where(Test.id == test_id, Test.project_id == project_id)
    )
    test = result.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test


@router.patch("/{project_id}/tests/{test_id}", response_model=TestResponse)
async def update_test(
    project_id: uuid.UUID,
    test_id: uuid.UUID,
    test_data: TestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Test)
        .where(Test.id == test_id, Test.project_id == project_id)
    )
    test = result.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    update_data = test_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(test, field, value)

    await db.commit()
    await db.refresh(test)
    return test


@router.delete("/{project_id}/tests/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test(
    project_id: uuid.UUID,
    test_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Test)
        .where(Test.id == test_id, Test.project_id == project_id)
    )
    test = result.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    await db.delete(test)
    await db.commit()