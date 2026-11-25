"""AI steps for the research → production → learning modules.

Every function returns (data, source) where source is "ai" or "template". With
no LLM configured (or when the call fails) a deterministic template built from
the real inputs (transcripts, stats, the strategy) is returned instead, so every
module keeps working without an API key.
"""

from __future__ import annotations

import logging
import re
import statistics
from collections import Counter
from typing import Any, Callable, Dict, List, Optional, Tuple

from app.services import llm

logger = logging.getLogger(__name__)

Result = Tuple[Dict[str, Any], str]

# Analyses the Investigation Studio can run from a transcript + metadata.
# (Frame-level visual analyses would need the video file and a vision model.)
TEXT_ANALYSES: Dict[str, str] = {
    "HOOKS": "How the first seconds grab attention: technique, exact opening line, why it works",
    "STORYTELLING": "Story devices: characters, conflict, stakes, examples, payoff",
    "NARRATIVE_STRUCTURE": "Section-by-section structure with timestamps (setup, build, payoff, close)",
    "CURIOSITY_LOOPS": "Open questions or teases that keep viewers watching, and where they close",
    "EMOTIONAL_TRIGGERS": "Emotions targeted (fear, aspiration, surprise, humor...) and the lines that trigger them",
    "PACING": "Speed of information, how often the topic shifts, words per minute, dead spots",
    "CTAS": "Calls to action: what is asked, when, and how it is framed",
    "PAYOFFS": "Promises made early and whether/when they are delivered",
    "TONE": "Voice and tone: register, energy, persona, vocabulary",
    "HEADLINES": "Title and on-screen headline strategy: keywords, curiosity gap, promise",
    "SPEECH_TRANSCRIPTION": "Transcript summary: key points in order, word count, language",
}

CTA_WORDS = re.compile(r"\b(subscribe|like (this|the) video|comment|follow|link in|description|sign up|download|join|check out)\b", re.I)


async def _generate(system: str, prompt: str, fallback: Callable[[], Dict[str, Any]], max_tokens: int = 4000) -> Result:
    try:
        return await llm.complete_json(system, prompt, max_tokens=max_tokens), "ai"
    except llm.LLMUnavailable:
        return fallback(), "template"
    except Exception as e:
        logger.warning("LLM step failed, using template: %s", e)
        data = fallback()
        data["_warning"] = f"AI request failed, showing template output ({e})"
        return data, "template"


def _clamp(value: Any, default: float = 0.5) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return default


def _ts(seconds: float) -> str:
    seconds = int(seconds or 0)
    return f"{seconds // 60}:{seconds % 60:02d}"


# ---------------------------------------------------------------- investigation

def _segments(reference) -> List[Dict[str, Any]]:
    transcript = (reference.reference_metadata or {}).get("transcript") or {}
    return transcript.get("segments") or []


def _transcript_for_prompt(segments: List[Dict[str, Any]], limit_chars: int = 14000) -> str:
    lines, total = [], 0
    for seg in segments:
        line = f"[{_ts(seg.get('start', 0))}] {seg.get('text', '')}"
        total += len(line)
        if total > limit_chars:
            lines.append("[... transcript truncated ...]")
            break
        lines.append(line)
    return "\n".join(lines)


def _template_investigation(reference, analysis_types: List[str]) -> Dict[str, Any]:
    segs = _segments(reference)
    text = " ".join(s["text"] for s in segs)
    words = len(text.split())
    duration = reference.duration or (segs[-1]["start"] if segs else 0) or 0
    wpm = round(words / (duration / 60)) if duration and words else None
    opening = " ".join(s["text"] for s in segs if s["start"] < 15)
    questions = [s for s in segs if "?" in s["text"]]
    ctas = [s for s in segs if CTA_WORDS.search(s["text"])]
    thirds = []
    if segs and duration:
        for i, name in enumerate(("Opening", "Middle", "Ending")):
            part = [s for s in segs if i * duration / 3 <= s["start"] < (i + 1) * duration / 3]
            if part:
                thirds.append({"section": name, "starts_at": _ts(part[0]["start"]), "first_line": part[0]["text"]})

    no_ai = "Measured from the transcript only. Add an AI provider for interpretation."
    measured: Dict[str, Dict[str, Any]] = {
        "HOOKS": {
            "findings": {"opening_text_first_15s": opening or "(no captions)",
                         "opens_with_question": "?" in opening, "title": reference.title},
            "evidence": [{"timestamp": "0:00", "quote": opening[:300]}] if opening else [],
        },
        "PACING": {
            "findings": {"words": words, "duration_seconds": duration, "words_per_minute": wpm,
                         "caption_segments": len(segs)},
            "evidence": [],
        },
        "CTAS": {
            "findings": {"calls_to_action": len(ctas)},
            "evidence": [{"timestamp": _ts(s["start"]), "quote": s["text"]} for s in ctas[:10]],
        },
        "CURIOSITY_LOOPS": {
            "findings": {"questions_asked": len(questions)},
            "evidence": [{"timestamp": _ts(s["start"]), "quote": s["text"]} for s in questions[:10]],
        },
        "NARRATIVE_STRUCTURE": {"findings": {"sections": thirds}, "evidence": []},
        "SPEECH_TRANSCRIPTION": {
            "findings": {"words": words, "language": ((reference.reference_metadata or {}).get("transcript") or {}).get("language"),
                         "excerpt": text[:600]},
            "evidence": [],
        },
    }
    analyses = {}
    for t in analysis_types:
        base = measured.get(t, {"findings": {"note": "This analysis needs an AI provider."}, "evidence": []})
        analyses[t] = {**base, "interpretation": no_ai, "creative_applications": [],
                       "confidence": 0.4 if t in measured and segs else 0.1}
    return {"analyses": analyses}


async def investigate_reference(reference, analysis_types: List[str]) -> Result:
    segs = _segments(reference)
    metrics = reference.engagement_metrics or {}
    prompt = "\n".join([
        f"VIDEO: {reference.title}",
        f"CREATOR: {reference.creator_name}",
        f"PLATFORM: {reference.source_platform.value if reference.source_platform else 'unknown'}",
        f"DURATION: {reference.duration} s",
        f"STATS: {metrics}",
        f"HASHTAGS/TAGS: {', '.join((reference.hashtags or [])[:20])}",
        f"DESCRIPTION: {(reference.description or '')[:1500]}",
        "",
        "TRANSCRIPT (timestamped):" if segs else "TRANSCRIPT: not available; base the analysis on title, description and stats and lower confidence.",
        _transcript_for_prompt(segs),
        "",
        "Run these analyses:",
        *[f"- {t}: {TEXT_ANALYSES.get(t, t)}" for t in analysis_types],
        "",
        'Return JSON: {"analyses": {"<TYPE>": {"findings": {key facts}, "evidence": [{"timestamp": "m:ss", "quote": str}],',
        ' "interpretation": str (why it works or not), "creative_applications": [how to reuse it in an original video],',
        ' "confidence": 0-1}}}. Quote the transcript exactly in evidence.',
    ])
    return await _generate(
        "You are a video reverse-engineering analyst. You explain precisely why content performs, citing timestamps.",
        prompt,
        lambda: _template_investigation(reference, analysis_types),
        max_tokens=6000,
    )


# ---------------------------------------------------------- multi-reference DNA

def _template_synthesis(refs: List[Dict[str, Any]]) -> Dict[str, Any]:
    durations = [r["duration"] for r in refs if r.get("duration")]
    views = [r["views"] for r in refs if r.get("views")]
    tags = Counter(t.lower() for r in refs for t in r.get("tags", []))
    best = max(refs, key=lambda r: r.get("views") or 0)
    return {
        "summary": f"Compared {len(refs)} references. Add an AI provider for a pattern analysis.",
        "common_patterns": [f"Shared tag: {t} ({n} videos)" for t, n in tags.most_common(5) if n > 1],
        "creative_dna": {
            "typical_duration_seconds": int(statistics.median(durations)) if durations else None,
            "hooks_used": [r.get("hook") for r in refs if r.get("hook")],
        },
        "performance_comparison": [
            {"title": r["title"], "views": r.get("views"), "engagement_rate": r.get("engagement_rate"),
             "duration": r.get("duration")} for r in sorted(refs, key=lambda r: r.get("views") or 0, reverse=True)
        ],
        "transfer_principles": [f"Study the opening of \"{best['title']}\", the most viewed reference."],
        "recommendations": [],
        "median_views": int(statistics.median(views)) if views else None,
    }


async def synthesize_references(refs: List[Dict[str, Any]]) -> Result:
    blocks = []
    for i, r in enumerate(refs, 1):
        blocks.append(
            f"REFERENCE {i}: {r['title']} | {r.get('creator')} | {r.get('views')} views | "
            f"engagement {r.get('engagement_rate')} | {r.get('duration')} s\n"
            f"Opening: {r.get('hook') or 'n/a'}\nInvestigations: {r.get('investigations') or 'none yet'}"
        )
    prompt = "\n\n".join(blocks) + "\n\n" + "\n".join([
        "Find what these videos have in common and why the best ones outperform. Return JSON:",
        '{"summary": str, "common_patterns": [str], "creative_dna": {"hook_style": str, "structure": str,',
        ' "pacing": str, "tone": str, "visual_style": str, "signature_moves": [str]},',
        ' "performance_comparison": [{"title": str, "why_it_performs": str}],',
        ' "transfer_principles": [principles to apply in an ORIGINAL video, without copying],',
        ' "recommendations": [str]}',
    ])
    return await _generate(
        "You are a creative intelligence analyst who extracts reusable creative principles from multiple videos.",
        prompt,
        lambda: _template_synthesis(refs),
        max_tokens=5000,
    )


# ------------------------------------------------------------------- testing

def _template_variants(test_type: str, production, strategy, count: int) -> Dict[str, Any]:
    seeds: List[str] = []
    hooks = (production.hooks or {}) if production else {}
    for value in hooks.values():
        if isinstance(value, str):
            seeds.append(value)
        elif isinstance(value, list):
            seeds += [v if isinstance(v, str) else str(v) for v in value]
    if strategy is not None:
        seeds += [strategy.hook_direction, strategy.core_message, strategy.creative_angle]
    seeds = [s for s in seeds if s] or ["Current version"]
    variants = [
        {"label": chr(65 + i), "content": seeds[i % len(seeds)], "rationale": "From the production/strategy (template)",
         "predicted_score": None}
        for i in range(count)
    ]
    return {
        "variants": variants,
        "performance_hypothesis": {"hypothesis": f"Variants of the {test_type.replace('_', ' ').lower()} will differ in retention.",
                                   "primary_metric": "3-second hold rate"},
        "audience_experiment": {"method": "Publish variants to similar audiences or use YouTube's Test & Compare.",
                                "sample_size_note": "Run until each variant has at least ~1,000 impressions."},
    }


async def generate_test_variants(test_type: str, production, strategy, count: int) -> Result:
    prompt = "\n".join([
        f"TEST TYPE: {test_type}",
        f"STRATEGY: angle={getattr(strategy, 'creative_angle', None)} | message={getattr(strategy, 'core_message', None)} | "
        f"hook direction={getattr(strategy, 'hook_direction', None)} | audience={getattr(strategy, 'target_audience', None)}",
        f"PRODUCTION FORMAT: {production.format.value if production else None}",
        f"CURRENT HOOKS: {getattr(production, 'hooks', None)}",
        f"CURRENT SCRIPT (excerpt): {str(getattr(production, 'script', ''))[:2000]}",
        "",
        f"Write {count} genuinely different variants to A/B test. Return JSON:",
        '{"variants": [{"label": "A", "content": str (the exact variant), "rationale": str,',
        ' "predicted_score": 0-1}], "performance_hypothesis": {"hypothesis": str, "primary_metric": str,',
        ' "expected_winner": label, "why": str}, "audience_experiment": {"method": str, "duration": str,',
        ' "success_criteria": str}}',
    ])
    data, source = await _generate(
        "You design rigorous creative A/B tests for short-form and long-form video.",
        prompt,
        lambda: _template_variants(test_type, production, strategy, count),
    )
    for v in data.get("variants") or []:
        if isinstance(v, dict) and v.get("predicted_score") is not None:
            v["predicted_score"] = _clamp(v["predicted_score"])
    return data, source


# ----------------------------------------------------------------- publishing

PLATFORM_LIMITS = {
    "YOUTUBE": "title max 100 chars, description up to 5000 chars with timestamps, 10-15 tags",
    "TIKTOK": "caption max 2200 chars (first line is the hook), 3-5 hashtags, no tags",
    "INSTAGRAM": "caption max 2200 chars, hook in the first 125 chars, 5-10 hashtags",
    "FACEBOOK": "short caption, 1-3 hashtags",
    "TWITTER": "max 280 chars including hashtags",
    "LINKEDIN": "professional tone, max 3000 chars, 3-5 hashtags",
}


STOPWORDS = frozenset("""about after also because been before being between both could does doing during each from have
having here into just like make master more most much only other over same should some such than that their them
then there these they this those through very what when where which while will with would your youre""".split())


def _template_publication(platform: str, strategy, production) -> Dict[str, Any]:
    topic = getattr(strategy, "topic", None) or "New video"
    message = getattr(strategy, "core_message", None) or ""
    words = [re.sub(r"[^\w-]", "", w).lower() for w in f"{topic} {message}".split()]
    tags = list(dict.fromkeys(w for w in words if len(w) > 3 and w not in STOPWORDS))[:10]
    return {
        "title": topic[:100],
        "description": f"{message}\n\n{getattr(strategy, 'creative_angle', '') or ''}".strip(),
        "tags": tags if platform == "YOUTUBE" else [],
        "hashtags": ["#" + re.sub(r"\W", "", t) for t in tags[:5]],
    }


async def draft_publication(platform: str, strategy, production) -> Result:
    prompt = "\n".join([
        f"PLATFORM: {platform} ({PLATFORM_LIMITS.get(platform, '')})",
        f"TOPIC: {getattr(strategy, 'topic', None)}",
        f"CORE MESSAGE: {getattr(strategy, 'core_message', None)}",
        f"ANGLE: {getattr(strategy, 'creative_angle', None)}",
        f"AUDIENCE: {getattr(strategy, 'target_audience', None)}",
        f"HOOKS: {getattr(production, 'hooks', None)}",
        f"SCRIPT (excerpt): {str(getattr(production, 'script', ''))[:1500]}",
        "",
        "Write publishing copy optimised for this platform's search and feed. Return JSON:",
        '{"title": str, "description": str, "tags": [str], "hashtags": ["#tag"], "best_posting_time": str,',
        ' "thumbnail_text": str}',
    ])
    data, source = await _generate(
        "You are a platform-native social media publisher who writes titles and captions that earn clicks honestly.",
        prompt,
        lambda: _template_publication(platform, strategy, production),
        max_tokens=2000,
    )
    data["hashtags"] = [h if str(h).startswith("#") else f"#{h}" for h in data.get("hashtags") or []]
    data["tags"] = [str(t) for t in data.get("tags") or []]
    return data, source


# ------------------------------------------------------------------ analytics

def _template_insights(a) -> Dict[str, Any]:
    good, weak, ideas = [], [], []
    er = a.engagement_rate or 0
    if er >= 0.04:
        good.append(f"Engagement rate {er:.1%} is strong (above ~4%).")
    elif a.views:
        weak.append(f"Engagement rate {er:.1%} is below the ~4% benchmark.")
        ideas.append("Ask a specific question in the video to drive comments.")
    if a.views and a.comments / max(a.views, 1) >= 0.005:
        good.append("Comment rate suggests the topic sparks discussion.")
    if a.completion_rate and a.completion_rate < 0.3:
        weak.append(f"Only {a.completion_rate:.0%} of viewers finish the video.")
        ideas.append("Tighten the middle section and move the payoff earlier.")
    return {"successful_elements": good, "weak_points": weak, "improvement_opps": ideas, "learnings": []}


async def analytics_insights(a, publication, strategy, test_predictions: Optional[Dict[str, Any]]) -> Result:
    prompt = "\n".join([
        f"PLATFORM: {a.platform.value}",
        f"PUBLISHED: {getattr(publication, 'title', None)} ({getattr(publication, 'platform_url', None)})",
        f"METRICS: views={a.views} likes={a.likes} comments={a.comments} shares={a.shares} saves={a.saves} "
        f"watch_time={a.watch_time}s completion={a.completion_rate} engagement={a.engagement_rate} "
        f"follower_growth={a.follower_growth}",
        f"PERFORMANCE OVER TIME: {a.performance_over_time}",
        f"STRATEGY: angle={getattr(strategy, 'creative_angle', None)} | hook={getattr(strategy, 'hook_direction', None)}",
        f"PRE-LAUNCH PREDICTIONS: {test_predictions or 'none'}",
        "",
        "Diagnose this performance and turn it into reusable learnings. Return JSON:",
        '{"successful_elements": [str], "weak_points": [str], "improvement_opps": [str],',
        ' "predicted_vs_actual": {"summary": str}, "learnings": [{"title": str, "category": "hooks"|"pacing"|',
        '"topics"|"formats"|"publishing"|"audience", "insight": str, "confidence": 0-1}]}',
    ])
    return await _generate(
        "You are a content performance analyst. Be specific and only claim what the numbers support.",
        prompt,
        lambda: _template_insights(a),
        max_tokens=3000,
    )
