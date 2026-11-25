"""One entry point for every LLM call in the backend.

Supported providers (set the API key for any one of them in .env):

    openai      OPENAI_API_KEY
    anthropic   ANTHROPIC_API_KEY
    gemini      GEMINI_API_KEY (or GOOGLE_AI_API_KEY)
    mistral     MISTRAL_API_KEY
    groq        GROQ_API_KEY
    deepseek    DEEPSEEK_API_KEY
    openrouter  OPENROUTER_API_KEY
    nvidia      NVIDIA_API_KEY (NVIDIA NIM)
    vercel      AI_GATEWAY_API_KEY (Vercel AI Gateway)
    teamorouter TEAMOROUTER_API_KEY
    tokenharbor TOKENHARBOR_API_KEY
    ollama      OLLAMA_BASE_URL (local models, no key)

Everything except Anthropic speaks the OpenAI chat-completions protocol, so one
client with a different base URL covers them. With several keys set, the first
in the order above wins unless LLM_PROVIDER names one. LLM_MODEL overrides that
provider's default model.

Each provider has fallback models for when its main model is busy. With
LLM_FALLBACK on (the default), a provider that still fails (out of credit,
overloaded, bad key) passes the request on to the next configured provider and
is skipped for a few minutes, so one dead key does not slow every request.

Callers use complete_json() / complete_text(). Both raise LLMUnavailable when no
provider is configured, so callers can fall back to their template output, and
LLMError when the provider call or the JSON parsing fails.
"""

from __future__ import annotations

import json
import logging
import time
from contextvars import ContextVar
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

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
    # Tried in order when the main model is overloaded (503), rate-limited (429) or retired (404)
    fallback_models: tuple = ()


PROVIDERS: List[Provider] = [
    Provider("openai", "OpenAI", ("OPENAI_API_KEY",), "gpt-4o-mini", json_mode=True, transcription_model="whisper-1",
             fallback_models=("gpt-4.1-mini",)),
    Provider("anthropic", "Anthropic", ("ANTHROPIC_API_KEY",), "claude-sonnet-5-5"),
    # "-latest" aliases follow Google's current Flash models, so the default does not go stale
    Provider("gemini", "Google Gemini", ("GEMINI_API_KEY", "GOOGLE_AI_API_KEY"), "gemini-flash-latest",
             base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
             fallback_models=("gemini-flash-lite-latest",)),
    # mistral-large-latest needs a paid tier; medium/small are on the standard plans
    Provider("mistral", "Mistral", ("MISTRAL_API_KEY",), "mistral-medium-latest",
             base_url="https://api.mistral.ai/v1", json_mode=True, fallback_models=("mistral-small-latest",)),
    Provider("groq", "Groq", ("GROQ_API_KEY",), "openai/gpt-oss-120b",
             base_url="https://api.groq.com/openai/v1", json_mode=True, transcription_model="whisper-large-v3",
             fallback_models=("qwen/qwen3.8-27b",)),
    Provider("deepseek", "DeepSeek", ("DEEPSEEK_API_KEY",), "deepseek-flash",
             base_url="https://api.deepseek.com", json_mode=True, fallback_models=("deepseek-v4-pro",)),
    Provider("openrouter", "OpenRouter", ("OPENROUTER_API_KEY",), "openrouter/auto",
             base_url="https://openrouter.ai/api/v1", fallback_models=("openai/gpt-4o-mini",)),
    Provider("nvidia", "NVIDIA NIM", ("NVIDIA_API_KEY",), "nvidia/nemotron-3.5-lightning-30b-a3b",
             base_url="https://integrate.api.nvidia.com/v1", fallback_models=("mistralai/mistral-large-4-1t-a52b",)),
    Provider("vercel", "Vercel AI Gateway", ("AI_GATEWAY_API_KEY",), "openai/gpt-4o-mini",
             base_url="https://ai-gateway.vercel.sh/v1", fallback_models=("google/gemini-2.5-flash",)),
    Provider("teamorouter", "TeamoRouter", ("TEAMOROUTER_API_KEY",), "deepseek-v4-flash",
             base_url="https://api.teamorouter.com/v1", fallback_models=("glm-5.3-flash-free",)),
    # ":free" models work without a paid plan on Token Harbor
    Provider("tokenharbor", "Token Harbor", ("TOKENHARBOR_API_KEY",), "deepseek-v4-flash:free",
             base_url="https://tokenharbor.ai/v1", fallback_models=("mimo-v2.6-flash:free",)),
    Provider("ollama", "Ollama (local)", ("OLLAMA_BASE_URL",), "llama3.1"),
]
_BY_NAME = {p.name: p for p in PROVIDERS}

# Provider name -> monotonic time until which it is skipped after failing
_cooldown_until: Dict[str, float] = {}
# Label of the provider that answered the latest call in this task (for "generated by")
_last_provider: ContextVar[Optional[str]] = ContextVar("llm_last_provider", default=None)


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
    """LLM_MODEL applies to the active provider only; fallback providers use their own default."""
    if provider is active_provider():
        return _setting("LLM_MODEL") or provider.default_model
    return provider.default_model


def provider_chain() -> List[Provider]:
    """Providers to try in order: the active one, then (with LLM_FALLBACK) the other configured ones.

    Providers that failed recently go to the back of the line rather than being dropped,
    so a request still has somewhere to go when every provider has had a bad minute.
    """
    first = active_provider()
    if first is None:
        return []
    chain = [first]
    if settings.LLM_FALLBACK:
        order = [n.strip().lower() for n in (_setting("LLM_FALLBACK_ORDER") or "").split(",") if n.strip()]
        unknown = [n for n in order if n not in _BY_NAME]
        if unknown:
            logger.warning("Unknown provider(s) in LLM_FALLBACK_ORDER: %s", ", ".join(unknown))
        candidates = [_BY_NAME[n] for n in order if n in _BY_NAME] if order else configured_providers()
        for p in candidates:
            if p not in chain and _key(p):
                chain.append(p)
    now = time.monotonic()
    ready = [p for p in chain if _cooldown_until.get(p.name, 0) <= now]
    cooling = [p for p in chain if _cooldown_until.get(p.name, 0) > now]
    return ready + cooling


def used_provider_label() -> Optional[str]:
    """Label of the provider that answered this task's latest LLM call (it may be a fallback)."""
    return _last_provider.get()


def status() -> Dict[str, Any]:
    """What the settings page shows: which providers have keys and which one is used."""
    active = active_provider()
    now = time.monotonic()
    return {
        "active_provider": active.name if active else None,
        "active_label": active.label if active else None,
        "model": active_model(active) if active else None,
        "requested_provider": _setting("LLM_PROVIDER"),
        "fallback": bool(settings.LLM_FALLBACK),
        "fallback_order": [p.label for p in provider_chain()[1:]],
        "providers": [
            {"name": p.name, "label": p.label, "configured": bool(_key(p)), "env": p.key_settings[0],
             "cooling_down": _cooldown_until.get(p.name, 0) > now}
            for p in PROVIDERS
        ],
    }


# No SDK retries: a busy or timed-out model moves straight to the next fallback model or
# provider, instead of waiting out a second timeout on the same one
_SDK_RETRIES = 0
# Overloaded, rate-limited, not on this plan (403), gone or not found: worth trying the next model
_FALLBACK_STATUSES = {403, 404, 429, 500, 502, 503, 504, 529}


def _openai_client(provider: Provider):
    from openai import AsyncOpenAI

    if provider.name == "ollama":
        return AsyncOpenAI(base_url=_key(provider), api_key="ollama", timeout=settings.LLM_TIMEOUT_SECONDS,
                           max_retries=_SDK_RETRIES)
    return AsyncOpenAI(api_key=_key(provider), base_url=provider.base_url, timeout=settings.LLM_TIMEOUT_SECONDS,
                       max_retries=_SDK_RETRIES)


def _require_provider() -> Provider:
    provider = active_provider()
    if provider is None:
        raise LLMUnavailable("No LLM provider configured; set an API key in .env (see app/services/llm.py)")
    return provider


def _models_to_try(provider: Provider) -> List[str]:
    models = [active_model(provider)]
    models += [m for m in provider.fallback_models if m not in models]
    return models


async def _call(provider: Provider, model: str, system: str, prompt: str, max_tokens: int,
                temperature: float, json_mode: bool) -> str:
    if provider.name == "anthropic":
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=_key(provider), timeout=settings.LLM_TIMEOUT_SECONDS,
                                          max_retries=_SDK_RETRIES)
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


async def complete_with_model(
    system: str,
    prompt: str,
    *,
    max_tokens: int = 4000,
    temperature: float = 0.7,
    json_mode: bool = False,
) -> Tuple[str, str]:
    """Single-turn completion; returns (text, "Provider / model" that answered).

    Tries the configured model, then the provider's fallback models when a model is
    overloaded, rate-limited or not available on this account. If the provider still
    fails, the next provider in provider_chain() gets the request.
    """
    chain = provider_chain()
    if not chain:
        _require_provider()  # raises LLMUnavailable with the setup hint
    errors: List[str] = []
    for provider in chain:
        provider_errors: List[str] = []
        for model in _models_to_try(provider):
            try:
                text = await _call(provider, model, system, prompt, max_tokens, temperature, json_mode)
            except Exception as e:  # SDK errors differ per provider; normalise them
                status = getattr(e, "status_code", None)
                timed_out = "Timeout" in type(e).__name__
                provider_errors.append(f"{model}: {'timed out' if timed_out else str(e)[:300]}")
                if status not in _FALLBACK_STATUSES and not timed_out:
                    break
                logger.warning("LLM model %s on %s unavailable (%s), trying the next model",
                               model, provider.label, "timed out" if timed_out else f"HTTP {status}")
                continue
            if errors or provider_errors:
                logger.info("LLM answered with %s / %s after: %s", provider.label, model,
                            "; ".join(errors + provider_errors))
            _cooldown_until.pop(provider.name, None)
            _last_provider.set(provider.label)
            return text, f"{provider.label} / {model}"
        errors.append(f"{provider.label} ({' | '.join(provider_errors)})")
        _cooldown_until[provider.name] = time.monotonic() + settings.LLM_PROVIDER_COOLDOWN_SECONDS
        if provider is not chain[-1]:
            logger.warning("LLM provider %s failed, trying the next configured provider", provider.label)
    raise LLMError("Every configured AI provider failed: " + "; ".join(errors))


async def complete_text(
    system: str,
    prompt: str,
    *,
    max_tokens: int = 4000,
    temperature: float = 0.7,
    json_mode: bool = False,
) -> str:
    """Single-turn completion; returns the model's text."""
    text, _ = await complete_with_model(system, prompt, max_tokens=max_tokens, temperature=temperature,
                                        json_mode=json_mode)
    return text


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
    """Speech-to-text via an OpenAI-style transcription API (OpenAI, Groq), in provider_chain() order."""
    _require_provider()
    capable = [p for p in provider_chain() if p.transcription_model]
    if not capable:
        raise LLMUnavailable("No configured provider can transcribe audio; add an OpenAI or Groq key")
    errors: List[str] = []
    for provider in capable:
        client = _openai_client(provider)
        try:
            with open(audio_path, "rb") as audio:
                result = await client.audio.transcriptions.create(model=provider.transcription_model, file=audio)
            return result.text
        except Exception as e:
            errors.append(f"{provider.label}: {str(e)[:300]}")
    raise LLMError("Transcription failed: " + "; ".join(errors))
