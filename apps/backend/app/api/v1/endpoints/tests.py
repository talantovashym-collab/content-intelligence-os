from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.db.session import get_db
from app.models.test import Test, TestType
from app.models.production import Production
from app.api.v1.endpoints.auth import get_current_user
from app.api.v1.ownership import owned_project, owned_item, item_in_project
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
    project = await owned_project(db, project_id, current_user)

    if test_data.production_id:
        production = await item_in_project(db, Production, test_data.production_id, project_id, "Production")

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
    project = await owned_project(db, project_id, current_user)

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
    test = await owned_item(db, Test, test_id, project_id, current_user, "Test")
    return test


@router.patch("/{project_id}/tests/{test_id}", response_model=TestResponse)
async def update_test(
    project_id: uuid.UUID,
    test_id: uuid.UUID,
    test_data: TestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    test = await owned_item(db, Test, test_id, project_id, current_user, "Test")

    update_data = test_data.model_dump(exclude_unset=True)
    if update_data.get("production_id"):
        await item_in_project(db, Production, update_data["production_id"], project_id, "Production")
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
    test = await owned_item(db, Test, test_id, project_id, current_user, "Test")

    await db.delete(test)
    await db.commit()