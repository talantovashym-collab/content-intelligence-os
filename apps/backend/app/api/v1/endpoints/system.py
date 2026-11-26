"""The signed-in user's AI setup: their own provider keys, their order, and a live test.

Keys are encrypted at rest (app/core/secrets.py) and never returned: responses carry
only the last four characters. Every user must bring their own keys; see llm.py.
"""

import time
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core import secrets
from app.db.session import get_db
from app.models.user import ApiKey, User
from app.services import llm

router = APIRouter()


class SavedKey(BaseModel):
    provider: str
    label: str
    key_hint: Optional[str]
    model: Optional[str]
    default_model: str
    priority: int
    updated_at: datetime


class KeyInput(BaseModel):
    api_key: Optional[str] = Field(None, min_length=8, max_length=500)
    # Empty string clears the override and goes back to the provider's default
    model: Optional[str] = Field(None, max_length=200)

    @field_validator("api_key")
    @classmethod
    def _clean_key(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().strip('"').strip("'")
        if any(c.isspace() for c in v):
            raise ValueError("API key must not contain spaces or line breaks")
        return v


class KeyOrder(BaseModel):
    providers: List[str] = Field(..., min_length=1, max_length=20)


async def _user_keys(db: AsyncSession, user: User) -> List[ApiKey]:
    rows = await db.execute(
        select(ApiKey).where(ApiKey.user_id == user.id).order_by(ApiKey.priority, ApiKey.created_at)
    )
    return [k for k in rows.scalars().all() if llm.user_provider(k.provider)]


def _saved(row: ApiKey) -> SavedKey:
    p = llm.user_provider(row.provider)
    return SavedKey(provider=row.provider, label=p.label, key_hint=row.key_hint, model=row.model,
                    default_model=p.default_model, priority=row.priority, updated_at=row.updated_at)


def _provider_or_404(name: str) -> "llm.Provider":
    p = llm.user_provider(name)
    if p is None:
        raise HTTPException(status_code=404, detail=f"Unknown provider {name!r}")
    return p


async def _status(db: AsyncSession, user: User) -> dict:
    llm.set_user(user.id)  # reload after any change in this request
    return {**await llm.status(), "keys": [_saved(k) for k in await _user_keys(db, user)]}


@router.get("/ai")
async def ai_status(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """The user's saved keys (hints only), which one is primary, and the fallback order."""
    return await _status(db, current_user)


@router.put("/ai/keys/{provider}")
async def save_key(
    provider: str,
    data: KeyInput,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add or replace the user's key for a provider, and/or set its model. New keys go last in the order."""
    _provider_or_404(provider)
    keys = await _user_keys(db, current_user)
    row = next((k for k in keys if k.provider == provider), None)
    if row is None:
        if not data.api_key:
            raise HTTPException(status_code=422, detail="api_key is required for a new provider")
        row = ApiKey(user_id=current_user.id, provider=provider,
                     priority=(max((k.priority for k in keys), default=-1) + 1))
        db.add(row)
    if data.api_key:
        row.encrypted_key = secrets.encrypt(data.api_key)
        row.key_hint = secrets.hint(data.api_key)
        row.is_active = True
    if data.model is not None:
        row.model = data.model.strip() or None
    await db.commit()
    return await _status(db, current_user)


@router.delete("/ai/keys/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_key(provider: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Remove the user's key for a provider (it is deleted, not just hidden)."""
    _provider_or_404(provider)
    keys = await _user_keys(db, current_user)
    row = next((k for k in keys if k.provider == provider), None)
    if row is None:
        raise HTTPException(status_code=404, detail="No saved key for that provider")
    await db.delete(row)
    for i, k in enumerate(k for k in keys if k is not row):
        k.priority = i
    await db.commit()
    llm.set_user(current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/ai/order")
async def reorder_keys(data: KeyOrder, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Set the order keys are tried in: the first is primary, the rest are fallbacks."""
    keys = {k.provider: k for k in await _user_keys(db, current_user)}
    if sorted(data.providers) != sorted(keys):
        raise HTTPException(status_code=422, detail="List every saved provider exactly once")
    for i, name in enumerate(data.providers):
        keys[name].priority = i
    await db.commit()
    return await _status(db, current_user)


@router.post("/ai/test")
async def ai_test(
    provider: Optional[str] = Query(None, description="Test only this saved key; default tests the whole chain"),
    current_user: User = Depends(get_current_user),
):
    """Send one tiny request with the user's keys to check they work."""
    if provider is not None:
        _provider_or_404(provider)
    started = time.monotonic()
    try:
        # Room for "thinking" models, which spend tokens before they answer
        reply, model = await llm.complete_with_model(
            "You are a connectivity check.", "Reply with the single word: ok",
            max_tokens=1000, temperature=0, only=provider,
        )
    except llm.LLMUnavailable as e:
        raise HTTPException(status_code=400, detail=str(e))
    except llm.LLMError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"model": model, "reply": reply.strip()[:100] or "(empty reply)",
            "latency_ms": round((time.monotonic() - started) * 1000)}
