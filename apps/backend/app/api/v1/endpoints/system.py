"""System information for the settings page: which AI provider is configured."""

import time

from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.services import llm

router = APIRouter()


@router.get("/ai")
async def ai_status(current_user: User = Depends(get_current_user)):
    """Which LLM providers have keys, and which one (and model) requests go to."""
    return llm.status()


@router.post("/ai/test")
async def ai_test(current_user: User = Depends(get_current_user)):
    """Send one tiny request to the active provider to check the key and model work."""
    started = time.monotonic()
    try:
        # Room for "thinking" models, which spend tokens before they answer
        reply, model = await llm.complete_with_model(
            "You are a connectivity check.", "Reply with the single word: ok", max_tokens=1000, temperature=0
        )
    except llm.LLMUnavailable as e:
        raise HTTPException(status_code=400, detail=str(e))
    except llm.LLMError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {**llm.status(), "model": model, "reply": reply.strip()[:100] or "(empty reply)",
            "latency_ms": round((time.monotonic() - started) * 1000)}
