"""One entry point for every LLM call in the backend.

Supported providers (set the API key for any one of them in .env):

    openai      OPENAI_API_KEY
    anthropic   ANTHROPIC_API_KEY
    gemini      GEMINI_API_KEY (or GOOGLE_AI_API_KEY)
    mistral     MISTRAL_API_KEY
    groq        GROQ_API_KEY
    deepseek    DEEPSEEK_API_KEY
    openrouter  OPENROUTER_API_KEY
    ollama      OLLAMA_BASE_URL (local models, no key)

Everything except Anthropic speaks the OpenAI chat-completions protocol, so one
client with a different base URL covers them. With several keys set, the first
in the order above wins unless LLM_PROVIDER names one. LLM_MODEL overrides the
provider's default model.

Callers use complete_json() / complete_text(). Both raise LLMUnavailable when no
provider is configured, so callers can fall back to their template output, and
LLMError when the provider call or the JSON parsing fails.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMUnavailable(RuntimeError):
    """No provider is configured (no API key set)."""


class LLMError(RuntimeError):
    """The provider call failed or returned something unusable."""


@dataclass(frozen=True)
class Provider:
    name: str
    label: str
    key_settings: tuple  # settings attributes checked in order for the key
    default_model: str
    base_url: Optional[str] = None  # None = the SDK default (api.openai.com)
    json_mode: bool = False  # supports response_format={"type": "json_object"}
    transcription_model: Optional[str] = None  # OpenAI-style /audio/transcriptions


PROVIDERS: List[Provider] = [
    Provider("openai", "OpenAI", ("OPENAI_API_KEY",), "gpt-4o-mini", json_mode=True, transcription_model="whisper-1"),
    Provider("anthropic", "Anthropic", ("ANTHROPIC_API_KEY",), "claude-sonnet-5-5"),
    Provider("gemini", "Google Gemini", ("GEMINI_API_KEY", "GOOGLE_AI_API_KEY"), "gemini-2.5-flash",
             base_url="https://generativelanguage.googleapis.com/v1beta/openai/"),
    Provider("mistral", "Mistral", ("MISTRAL_API_KEY",), "mistral-large-latest",
             base_url="https://api.mistral.ai/v1", json_mode=True),
    Provider("groq", "Groq", ("GROQ_API_KEY",), "llama-3.3-70b-versatile",
             base_url="https://api.groq.com/openai/v1", json_mode=True, transcription_model="whisper-large-v3"),
    Provider("deepseek", "DeepSeek", ("DEEPSEEK_API_KEY",), "deepseek-chat",
             base_url="https://api.deepseek.com", json_mode=True),
    Provider("openrouter", "OpenRouter", ("OPENROUTER_API_KEY",), "openrouter/auto",
             base_url="https://openrouter.ai/api/v1"),
    Provider("ollama", "Ollama (local)", ("OLLAMA_BASE_URL",), "llama3.1"),
]
_BY_NAME = {p.name: p for p in PROVIDERS}


def _setting(name: str) -> Optional[str]:
    value = getattr(settings, name, None)
    return value.strip() if isinstance(value, str) and value.strip() else None


def _key(provider: Provider) -> Optional[str]:
    for attr in provider.key_settings:
        if value := _setting(attr):
            return value
    return None


def configured_providers() -> List[Provider]:
    return [p for p in PROVIDERS if _key(p)]


def active_provider() -> Optional[Provider]:
    """The provider calls go to: LLM_PROVIDER if set (and configured), else the first configured one."""
    wanted = (_setting("LLM_PROVIDER") or "").lower()
    if wanted and wanted != "auto":
        provider = _BY_NAME.get(wanted)
        if provider is None:
            logger.warning("Unknown LLM_PROVIDER %r; choose one of %s", wanted, ", ".join(_BY_NAME))
            return None
        return provider if _key(provider) else None
    configured = configured_providers()
    return configured[0] if configured else None


def active_model(provider: Provider) -> str:
    return _setting("LLM_MODEL") or provider.default_model


def status() -> Dict[str, Any]:
    """What the settings page shows: which providers have keys and which one is used."""
    active = active_provider()
    return {
        "active_provider": active.name if active else None,
        "active_label": active.label if active else None,
        "model": active_model(active) if active else None,
        "requested_provider": _setting("LLM_PROVIDER"),
        "providers": [
            {"name": p.name, "label": p.label, "configured": bool(_key(p)), "env": p.key_settings[0]}
            for p in PROVIDERS
        ],
    }


def _openai_client(provider: Provider):
    from openai import AsyncOpenAI

    if provider.name == "ollama":
        return AsyncOpenAI(base_url=_key(provider), api_key="ollama", timeout=settings.LLM_TIMEOUT_SECONDS)
    return AsyncOpenAI(api_key=_key(provider), base_url=provider.base_url, timeout=settings.LLM_TIMEOUT_SECONDS)


def _require_provider() -> Provider:
    provider = active_provider()
    if provider is None:
        raise LLMUnavailable("No LLM provider configured; set an API key in .env (see app/services/llm.py)")
    return provider


async def complete_text(
    system: str,
    prompt: str,
    *,
    max_tokens: int = 4000,
    temperature: float = 0.7,
    json_mode: bool = False,
) -> str:
    """Single-turn completion; returns the model's text."""
    provider = _require_provider()
    model = active_model(provider)
    try:
        if provider.name == "anthropic":
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=_key(provider), timeout=settings.LLM_TIMEOUT_SECONDS)
            response = await client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=[{"role": "user", "content": prompt}],
            )
            return "".join(block.text for block in response.content if getattr(block, "type", "") == "text")

        client = _openai_client(provider)
        kwargs: Dict[str, Any] = {}
        if json_mode and provider.json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs,
        )
        return response.choices[0].message.content or ""
    except LLMUnavailable:
        raise
    except Exception as e:  # SDK errors differ per provider; normalise them
        raise LLMError(f"{provider.label} ({model}) request failed: {e}") from e


def parse_json_object(text: str) -> Dict[str, Any]:
    """Models sometimes wrap JSON in prose or ``` fences; take the outermost object."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise LLMError("Model response contained no JSON object")
    try:
        value = json.loads(text[start:end + 1])
    except json.JSONDecodeError as e:
        raise LLMError(f"Model returned invalid JSON: {e}") from e
    if not isinstance(value, dict):
        raise LLMError("Model returned JSON that is not an object")
    return value


async def complete_json(
    system: str,
    prompt: str,
    *,
    max_tokens: int = 4000,
    temperature: float = 0.7,
) -> Dict[str, Any]:
    """Completion that must return one JSON object."""
    system = system.rstrip() + "\nRespond with a single valid JSON object and nothing else."
    text = await complete_text(system, prompt, max_tokens=max_tokens, temperature=temperature, json_mode=True)
    return parse_json_object(text)


async def transcribe(audio_path: Path) -> str:
    """Speech-to-text via the active provider's OpenAI-style transcription API (OpenAI, Groq)."""
    provider = _require_provider()
    if not provider.transcription_model:
        raise LLMUnavailable(f"{provider.label} has no transcription API; use OpenAI or Groq for audio")
    client = _openai_client(provider)
    try:
        with open(audio_path, "rb") as audio:
            result = await client.audio.transcriptions.create(model=provider.transcription_model, file=audio)
        return result.text
    except Exception as e:
        raise LLMError(f"{provider.label} transcription failed: {e}") from e
