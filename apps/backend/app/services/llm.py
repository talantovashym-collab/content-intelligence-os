"""One entry point for every LLM call in the backend.

Supported providers (the env names apply to server keys only):

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
client with a different base URL covers them.

Whose keys: every user brings their own. They save them in Settings (encrypted in
the api_keys table) and put them in order; the first is used, the rest are
fallbacks. get_current_user() calls set_user(), so any LLM call made while
handling that user's request uses that user's keys. The .env keys (with
LLM_PROVIDER / LLM_MODEL / LLM_FALLBACK_ORDER) are only used when
ALLOW_SERVER_KEYS is on, for a private single-user install.

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
import hashlib
import time
import uuid
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


# Where users get a key for each provider (shown next to the key field)
KEY_URLS: Dict[str, str] = {
    "openai": "https://platform.openai.com/api-keys",
    "anthropic": "https://console.anthropic.com/settings/keys",
    "gemini": "https://aistudio.google.com/apikey",
    "mistral": "https://console.mistral.ai/api-keys",
    "groq": "https://console.groq.com/keys",
    "deepseek": "https://platform.deepseek.com/api_keys",
    "openrouter": "https://openrouter.ai/keys",
    "nvidia": "https://build.nvidia.com",
    "vercel": "https://vercel.com/docs/ai-gateway",
    "teamorouter": "https://teamorouter.com",
    "tokenharbor": "https://tokenharbor.ai",
}
# Ollama is configured by URL, not key; letting users point the server at any URL
# would let them make it fetch internal addresses, so it stays a server-side option.
USER_PROVIDERS: List[Provider] = [p for p in PROVIDERS if p.name in KEY_URLS]


def user_provider(name: str) -> Optional[Provider]:
    p = _BY_NAME.get(name)
    return p if p in USER_PROVIDERS else None


@dataclass(frozen=True)
class KeyRing:
    """The keys an LLM call may use, in the order to try them."""

    keys: Dict[str, str]  # provider name -> API key (or base URL for server-side Ollama)
    order: Tuple[str, ...]  # provider names, primary first
    models: Dict[str, str]  # provider name -> model override
    source: str  # "user", "server" or "none"


_EMPTY = KeyRing({}, (), {}, "none")
# The user whose request is being handled, and their keys once loaded (per asyncio task)
_current_user: ContextVar[Optional[uuid.UUID]] = ContextVar("llm_user", default=None)
_ring_cache: ContextVar[Optional[KeyRing]] = ContextVar("llm_ring", default=None)
# (provider, key fingerprint) -> monotonic time until which it is skipped after failing
_cooldown_until: Dict[str, float] = {}
# Label of the provider that answered the latest call in this task (for "generated by")
_last_provider: ContextVar[Optional[str]] = ContextVar("llm_last_provider", default=None)


def _setting(name: str) -> Optional[str]:
    value = getattr(settings, name, None)
    return value.strip() if isinstance(value, str) and value.strip() else None


def set_user(user_id: Optional[uuid.UUID]) -> None:
    """Use this user's keys for LLM calls in the current request/task (loaded on first use)."""
    _current_user.set(user_id)
    _ring_cache.set(None)


async def use_user(db, user_id: uuid.UUID) -> KeyRing:
    """Load a user's keys with an existing session (background jobs) and use them."""
    _current_user.set(user_id)
    ring = await _load_user_ring(db, user_id)
    _ring_cache.set(ring)
    return ring


async def _load_user_ring(db, user_id: uuid.UUID) -> KeyRing:
    from sqlalchemy import select

    from app.core.secrets import SecretUnreadable, decrypt
    from app.models.user import ApiKey

    rows = (await db.execute(
        select(ApiKey).where(ApiKey.user_id == user_id, ApiKey.is_active.is_(True), ApiKey.encrypted_key.isnot(None))
        .order_by(ApiKey.priority, ApiKey.created_at)
    )).scalars().all()
    keys: Dict[str, str] = {}
    models: Dict[str, str] = {}
    order: List[str] = []
    for row in rows:
        if not user_provider(row.provider):
            continue
        try:
            keys[row.provider] = decrypt(row.encrypted_key)
        except SecretUnreadable:
            logger.warning("Stored %s key for user %s cannot be decrypted; skipping it", row.provider, user_id)
            continue
        order.append(row.provider)
        if row.model:
            models[row.provider] = row.model
    return KeyRing(keys, tuple(order), models, "user") if keys else _EMPTY


def _server_ring() -> KeyRing:
    """Keys from .env, ordered by LLM_PROVIDER then LLM_FALLBACK_ORDER (server-key mode only)."""
    keys: Dict[str, str] = {}
    for p in PROVIDERS:
        for attr in p.key_settings:
            if value := _setting(attr):
                keys[p.name] = value
                break
    if not keys:
        return _EMPTY
    wanted = (_setting("LLM_PROVIDER") or "").lower()
    if wanted and wanted != "auto" and wanted not in keys:
        logger.warning("LLM_PROVIDER %r has no key (or is unknown)", wanted)
        return _EMPTY
    first = wanted if wanted in keys else next(iter(keys))
    order = [first]
    listed = [n.strip().lower() for n in (_setting("LLM_FALLBACK_ORDER") or "").split(",") if n.strip()]
    for name in (listed or list(keys)):
        if name in keys and name not in order:
            order.append(name)
    models = {first: m} if (m := _setting("LLM_MODEL")) else {}
    return KeyRing(keys, tuple(order), models, "server")


async def keyring() -> KeyRing:
    """The keys for the current request: the signed-in user's, else server keys if allowed."""
    cached = _ring_cache.get()
    if cached is not None:
        return cached
    ring = _EMPTY
    user_id = _current_user.get()
    if user_id is not None:
        from app.db.session import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            ring = await _load_user_ring(db, user_id)
    if ring is _EMPTY and settings.ALLOW_SERVER_KEYS:
        ring = _server_ring()
    _ring_cache.set(ring)
    return ring


def _fingerprint(provider: Provider, ring: KeyRing) -> str:
    """Cooldowns are per key, so one user's empty account never slows down another user."""
    return provider.name + ":" + hashlib.sha256(ring.keys.get(provider.name, "").encode()).hexdigest()[:12]


def provider_chain(ring: KeyRing) -> List[Provider]:
    """Providers to try in order: the primary, then (with LLM_FALLBACK) the user's other keys.

    Providers that failed recently go to the back of the line rather than being dropped,
    so a request still has somewhere to go when every provider has had a bad minute.
    """
    chain = [_BY_NAME[n] for n in ring.order if n in _BY_NAME]
    if not settings.LLM_FALLBACK:
        chain = chain[:1]
    now = time.monotonic()
    ready = [p for p in chain if _cooldown_until.get(_fingerprint(p, ring), 0) <= now]
    cooling = [p for p in chain if _cooldown_until.get(_fingerprint(p, ring), 0) > now]
    return ready + cooling


def active_model(provider: Provider, ring: KeyRing) -> str:
    return ring.models.get(provider.name) or provider.default_model


def used_provider_label() -> Optional[str]:
    """Label of the provider that answered this task's latest LLM call (it may be a fallback)."""
    return _last_provider.get()


async def status() -> Dict[str, Any]:
    """What the settings page shows: whose keys are in use, the order, and what is cooling down."""
    ring = await keyring()
    chain = provider_chain(ring)
    active = _BY_NAME[ring.order[0]] if ring.order else None
    now = time.monotonic()
    return {
        "source": ring.source,
        "server_keys_allowed": bool(settings.ALLOW_SERVER_KEYS),
        "active_provider": active.name if active else None,
        "active_label": active.label if active else None,
        "model": active_model(active, ring) if active else None,
        "fallback": bool(settings.LLM_FALLBACK),
        "fallback_order": [p.label for p in chain if p is not active],
        "providers": [
            {"name": p.name, "label": p.label, "default_model": p.default_model, "key_url": KEY_URLS[p.name],
             "configured": p.name in ring.keys,
             "cooling_down": p.name in ring.keys and _cooldown_until.get(_fingerprint(p, ring), 0) > now}
            for p in USER_PROVIDERS
        ],
    }


# No SDK retries: a busy or timed-out model moves straight to the next fallback model or
# provider, instead of waiting out a second timeout on the same one
_SDK_RETRIES = 0
# Overloaded, rate-limited, not on this plan (403), gone or not found: worth trying the next model
_FALLBACK_STATUSES = {403, 404, 429, 500, 502, 503, 504, 529}

NO_KEY_MESSAGE = "Add your own AI provider key in Settings → AI keys to turn on AI analysis."

_PLAIN_ERRORS = {
    400: "request rejected",  # some routers answer an empty wallet with 400
    401: "key rejected (wrong, expired or revoked)",
    402: "out of credit",
    403: "not allowed on this account or plan",
    404: "model not available",
    429: "rate-limited or out of quota",
}


def _plain(e: Exception) -> str:
    """A short, user-facing reason for a provider failure; the raw error goes to the log."""
    if "Timeout" in type(e).__name__:
        return "timed out"
    code = getattr(e, "status_code", None)
    if code is None:
        return "could not reach the provider" if "Connection" in type(e).__name__ else str(e)[:160]
    text = str(e).lower()
    if code in (400, 402, 403, 429) and any(w in text for w in ("balance", "credit", "billing", "quota", "subscription", "payment")):
        return f"HTTP {code}: out of credit or no active plan"
    return f"HTTP {code}: " + _PLAIN_ERRORS.get(code, "provider overloaded" if code >= 500 else "request failed")


def _openai_client(provider: Provider, key: str):
    from openai import AsyncOpenAI

    if provider.name == "ollama":
        return AsyncOpenAI(base_url=key, api_key="ollama", timeout=settings.LLM_TIMEOUT_SECONDS,
                           max_retries=_SDK_RETRIES)
    return AsyncOpenAI(api_key=key, base_url=provider.base_url, timeout=settings.LLM_TIMEOUT_SECONDS,
                       max_retries=_SDK_RETRIES)


def _models_to_try(provider: Provider, ring: KeyRing) -> List[str]:
    models = [active_model(provider, ring)]
    models += [m for m in provider.fallback_models if m not in models]
    return models


async def _call(provider: Provider, key: str, model: str, system: str, prompt: str, max_tokens: int,
                temperature: float, json_mode: bool) -> str:
    if provider.name == "anthropic":
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=key, timeout=settings.LLM_TIMEOUT_SECONDS,
                                          max_retries=_SDK_RETRIES)
        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(block.text for block in response.content if getattr(block, "type", "") == "text")

    client = _openai_client(provider, key)
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
    only: Optional[str] = None,
) -> Tuple[str, str]:
    """Single-turn completion; returns (text, "Provider / model" that answered).

    Tries the configured model, then the provider's fallback models when a model is
    overloaded, rate-limited or not available on this account. If the provider still
    fails, the next provider in provider_chain() gets the request. `only` restricts
    the call to one provider (the settings page's per-key test).
    """
    ring = await keyring()
    chain = provider_chain(ring)
    if only is not None:
        chain = [p for p in chain if p.name == only]
    if not chain:
        raise LLMUnavailable(NO_KEY_MESSAGE if only is None else f"No saved key for {only}")
    errors: List[str] = []
    for provider in chain:
        key = ring.keys[provider.name]
        provider_errors: List[str] = []
        for model in _models_to_try(provider, ring):
            try:
                text = await _call(provider, key, model, system, prompt, max_tokens, temperature, json_mode)
            except Exception as e:  # SDK errors differ per provider; normalise them
                status_code = getattr(e, "status_code", None)
                timed_out = "Timeout" in type(e).__name__
                provider_errors.append(f"{model}: {_plain(e)}")
                logger.info("LLM %s / %s failed: %s", provider.label, model, str(e)[:500])
                if status_code not in _FALLBACK_STATUSES and not timed_out:
                    break
                logger.warning("LLM model %s on %s unavailable (%s), trying the next model",
                               model, provider.label, "timed out" if timed_out else f"HTTP {status_code}")
                continue
            if errors or provider_errors:
                logger.info("LLM answered with %s / %s after: %s", provider.label, model,
                            "; ".join(errors + provider_errors))
            _cooldown_until.pop(_fingerprint(provider, ring), None)
            _last_provider.set(provider.label)
            return text, f"{provider.label} / {model}"
        errors.append(f"{provider.label} ({' | '.join(provider_errors)})")
        _cooldown_until[_fingerprint(provider, ring)] = time.monotonic() + settings.LLM_PROVIDER_COOLDOWN_SECONDS
        if provider is not chain[-1]:
            logger.warning("LLM provider %s failed, trying the next one", provider.label)
    raise LLMError(("Your AI key failed: " if len(chain) == 1 else "All your AI keys failed: ") + "; ".join(errors))


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


async def transcribe(audio_path: Path, language: Optional[str] = None) -> Dict[str, Any]:
    """Speech-to-text with timestamps via an OpenAI-style API (OpenAI, Groq), in provider_chain() order.

    Returns {"text", "language", "segments": [{"start", "end", "text"}], "provider"}.
    The file must be under the provider's upload limit (~25 MB); media.audio_chunks splits long audio.
    """
    ring = await keyring()
    chain = provider_chain(ring)
    if not chain:
        raise LLMUnavailable(NO_KEY_MESSAGE)
    capable = [p for p in chain if p.transcription_model]
    if not capable:
        raise LLMUnavailable("Transcribing uploads needs an OpenAI or Groq key; add one in Settings → AI keys")
    errors: List[str] = []
    for provider in capable:
        client = _openai_client(provider, ring.keys[provider.name])
        kwargs: Dict[str, Any] = {"model": provider.transcription_model, "response_format": "verbose_json"}
        if language and len(language) == 2:
            kwargs["language"] = language.lower()
        try:
            with open(audio_path, "rb") as audio:
                result = await client.audio.transcriptions.create(file=audio, **kwargs)
        except Exception as e:
            errors.append(f"{provider.label}: {_plain(e)}")
            logger.info("Transcription with %s failed: %s", provider.label, str(e)[:500])
            continue
        data = result if isinstance(result, dict) else result.model_dump()
        segments = [
            {"start": round(float(seg.get("start") or 0), 2), "end": round(float(seg.get("end") or 0), 2),
             "text": (seg.get("text") or "").strip()}
            for seg in (data.get("segments") or [])
            if (seg.get("text") or "").strip()
        ]
        text = (data.get("text") or " ".join(seg["text"] for seg in segments)).strip()
        _last_provider.set(provider.label)
        return {"text": text, "language": data.get("language"), "segments": segments, "provider": provider.label}
    raise LLMError("Transcription failed: " + "; ".join(errors))
