"""Opportunity discovery: real YouTube market data, turned into ranked content opportunities.

1. Market research: YouTube searches for the niche (most viewed, and most recent)
   via yt-dlp. These are real videos, creators and view counts.
2. Opportunity generation: the configured LLM reads that research and proposes
   opportunities (gaps, hooks, formats, risks, scores). Without an LLM, a
   template turns the strongest real videos into "do it better" opportunities.
3. Ranking + storage: a weighted overall score, saved as Opportunity rows.

Reference videos attached to an opportunity are always taken from the real
search results (the model can only pick by URL), never invented.
"""

from __future__ import annotations

import asyncio
import logging
import math
import statistics
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.opportunity import CreativeFormat as DBCreativeFormat, Opportunity, OpportunityStatus
from app.models.project import Project
from app.services import llm
from app.services.opportunity_discovery.schemas import OpportunityDiscoveryRequest
from app.services.video_sources import VideoInfo, VideoSourceError, search_youtube

logger = logging.getLogger(__name__)

SCORE_WEIGHTS = {
    "market_interest": 0.22,
    "trend_momentum": 0.15,
    "audience_relevance": 0.20,
    "content_saturation": 0.13,  # inverted: lower saturation scores higher
    "creative_potential": 0.18,
    "production_feasibility": 0.12,
}

SYSTEM_PROMPT = (
    "You are a content strategist who finds underserved video opportunities. You base every claim "
    "on the market research you are given and say so when evidence is thin."
)


@dataclass
class DiscoveryResult:
    opportunities: List[Opportunity]
    videos_analyzed: int
    used_ai: bool
    provider: Optional[str]
    queries: List[str]
    warnings: List[str] = field(default_factory=list)


def _clamp(value: Any, default: float = 0.5) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return default


def _rank(scores: Dict[str, Any]) -> Dict[str, float]:
    clean = {k: round(_clamp(scores.get(k)), 3) for k in SCORE_WEIGHTS}
    overall = sum(
        w * ((1 - clean[k]) if k == "content_saturation" else clean[k]) for k, w in SCORE_WEIGHTS.items()
    )
    return {**clean, "overall_score": round(overall, 3)}


def _formats(values: Any, fallback: List[str]) -> List[DBCreativeFormat]:
    out: List[DBCreativeFormat] = []
    for v in values if isinstance(values, list) else []:
        key = str(v).strip().upper().replace(" ", "_").replace("-", "_")
        if key in DBCreativeFormat.__members__ and DBCreativeFormat[key] not in out:
            out.append(DBCreativeFormat[key])
    return out or [DBCreativeFormat[f] for f in fallback]


def _str_list(value: Any, limit: int = 8) -> List[str]:
    if isinstance(value, str):
        value = [value]
    return [str(v).strip() for v in (value or []) if str(v).strip()][:limit]


class OpportunityDiscoveryEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def discover_opportunities(self, request: OpportunityDiscoveryRequest, project: Project) -> DiscoveryResult:
        niche = (request.niche or project.niche or project.title).strip()
        audience = (request.audience or project.target_audience or "").strip()
        count = max(1, min(request.max_results, 8))
        wanted_formats = [f.value.upper() for f in request.content_types] or ["EDUCATIONAL"]
        warnings: List[str] = []

        videos, queries = await self._research(niche, request.language, warnings)
        market = self._market_summary(videos)

        used_ai, provider = False, None
        try:
            raw = await self._generate_with_ai(niche, audience, request, videos, market, count, wanted_formats)
            used_ai = True
            active = llm.active_provider()
            provider = active.label if active else None
        except llm.LLMUnavailable:
            raw = self._generate_from_template(niche, audience, videos, market, count, wanted_formats)
            warnings.append("No AI provider configured: opportunities are templates built from the search results.")
        except Exception as e:
            logger.warning("AI opportunity generation failed: %s", e)
            raw = self._generate_from_template(niche, audience, videos, market, count, wanted_formats)
            warnings.append(f"AI generation failed, used templates instead ({e}).")

        by_url = {v.url: v for v in videos}
        rows: List[Opportunity] = []
        for item in raw[:count]:
            refs = [by_url[u].to_dict() for u in _str_list(item.get("reference_video_urls"), 6) if u in by_url]
            ranking = _rank(item.get("scores") or {})
            rows.append(
                Opportunity(
                    project_id=project.id,
                    title=str(item.get("title") or niche)[:300],
                    topic_description=str(item.get("topic_description") or ""),
                    target_audience=str(item.get("target_audience") or audience or "General audience"),
                    audience_need=str(item.get("audience_need") or ""),
                    market_evidence={
                        "origin": "discovery",
                        "summary": str(item.get("market_evidence") or ""),
                        "source": "ai" if used_ai else "template",
                        "market": market,
                    },
                    relevant_trends={"signals": _str_list(item.get("trend_signals"))},
                    competing_content={
                        "gaps": _str_list(item.get("content_gaps")),
                        "top_videos": [v.to_dict() for v in videos[:5]],
                    },
                    reference_videos={"videos": refs},
                    relevant_creators={"creators": market.get("top_creators", [])},
                    performance_data={"median_views": market.get("median_views"), "videos_analyzed": len(videos)},
                    audience_reactions={},
                    creative_formats=_formats(item.get("creative_formats"), wanted_formats),
                    potential_hooks={"hooks": _str_list(item.get("potential_hooks"))},
                    risks={"risks": _str_list(item.get("risks"))},
                    confidence_level=_clamp(item.get("confidence_level"), 0.4),
                    recommended_actions={"actions": _str_list(item.get("recommended_actions"))},
                    status=OpportunityStatus.DISCOVERED,
                    rank_scores=ranking,
                )
            )
        rows.sort(key=lambda o: o.rank_scores["overall_score"], reverse=True)

        self.db.add_all(rows)
        await self.db.commit()
        for row in rows:
            await self.db.refresh(row)
        return DiscoveryResult(rows, len(videos), used_ai, provider, queries, warnings)

    async def validate_idea(self, project: Project, concept: str, audience: Optional[str]) -> DiscoveryResult:
        """Check one user idea against what already exists on YouTube; stored as an Opportunity."""
        audience = (audience or project.target_audience or "").strip()
        warnings: List[str] = []
        videos, queries = await self._research(concept, project.language or "en", warnings)
        market = self._market_summary(videos)
        lines = [
            f"IDEA: {concept}",
            f"TARGET AUDIENCE: {audience or 'not specified'}",
            f"MARKET SUMMARY (YouTube search for the idea): {market}",
            "EXISTING VIDEOS (title | creator | views | url):",
            *[f"- {v.title} | {v.creator} | {v.views} | {v.url}" for v in videos[:20]],
            "",
            "Validate this idea against the existing videos. Return JSON:",
            '{"title": str (sharpened working title), "verdict": "strong"|"promising"|"crowded"|"weak",',
            ' "topic_description": str, "audience_need": str, "market_evidence": str (cite videos),',
            ' "content_gaps": [str], "better_angles": [str], "potential_hooks": [3 str], "risks": [str],',
            ' "recommended_actions": [str], "creative_formats": [STICKMAN|DOODLE|WHITEBOARD|CARTOON|',
            'MOTION_GRAPHICS|CINEMATIC|DOCUMENTARY|EDUCATIONAL], "confidence_level": 0-1,',
            ' "scores": {"market_interest": 0-1, "trend_momentum": 0-1, "audience_relevance": 0-1,',
            ' "content_saturation": 0-1, "creative_potential": 0-1, "production_feasibility": 0-1},',
            ' "reference_video_urls": [urls copied exactly from the list]}',
        ]
        used_ai, provider = False, None
        try:
            item = await llm.complete_json(SYSTEM_PROMPT, "\n".join(lines), max_tokens=3000)
            used_ai, provider = True, (llm.active_provider().label if llm.active_provider() else None)
        except Exception as e:
            if not isinstance(e, llm.LLMUnavailable):
                warnings.append(f"AI validation failed, showing market data only ({e}).")
            else:
                warnings.append("No AI provider configured: showing market data without a verdict.")
            median = market.get("median_views")
            crowded = len(videos) >= 15 and (median or 0) > 100_000
            item = {
                "title": concept[:300],
                "verdict": "crowded" if crowded else "unverified",
                "topic_description": concept,
                "market_evidence": f"{len(videos)} related videos found; median {median or 0:,} views.",
                "confidence_level": 0.3,
                "scores": {"market_interest": min(1.0, math.log10(max(median or 10, 10)) / 7),
                           "content_saturation": 0.8 if crowded else 0.5},
                "reference_video_urls": [v.url for v in videos[:3]],
            }

        by_url = {v.url: v for v in videos}
        row = Opportunity(
            project_id=project.id,
            title=str(item.get("title") or concept)[:300],
            topic_description=str(item.get("topic_description") or concept),
            target_audience=audience or "General audience",
            audience_need=str(item.get("audience_need") or ""),
            market_evidence={
                "origin": "idea",
                "concept": concept,
                "verdict": str(item.get("verdict") or "unverified"),
                "summary": str(item.get("market_evidence") or ""),
                "source": "ai" if used_ai else "template",
                "market": market,
            },
            relevant_trends={"better_angles": _str_list(item.get("better_angles"))},
            competing_content={"gaps": _str_list(item.get("content_gaps")),
                               "top_videos": [v.to_dict() for v in videos[:5]]},
            reference_videos={"videos": [by_url[u].to_dict() for u in _str_list(item.get("reference_video_urls"), 6) if u in by_url]},
            relevant_creators={"creators": market.get("top_creators", [])},
            performance_data={"median_views": market.get("median_views"), "videos_analyzed": len(videos)},
            audience_reactions={},
            creative_formats=_formats(item.get("creative_formats"), ["EDUCATIONAL"]),
            potential_hooks={"hooks": _str_list(item.get("potential_hooks"))},
            risks={"risks": _str_list(item.get("risks"))},
            confidence_level=_clamp(item.get("confidence_level"), 0.3),
            recommended_actions={"actions": _str_list(item.get("recommended_actions"))},
            status=OpportunityStatus.RESEARCHING,
            rank_scores=_rank(item.get("scores") or {}),
        )
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        return DiscoveryResult([row], len(videos), used_ai, provider, queries, warnings)

    async def _research(self, niche: str, language: str, warnings: List[str]):
        queries = [niche]
        # Relevance search (sorted by views below) plus the newest uploads for momentum
        results = await asyncio.gather(
            search_youtube(niche, limit=20, sort="relevance", language=language),
            search_youtube(niche, limit=10, sort="date", language=language),
            return_exceptions=True,
        )
        videos: Dict[str, VideoInfo] = {}
        for result in results:
            if isinstance(result, VideoSourceError):
                warnings.append(str(result))
                continue
            if isinstance(result, Exception):
                warnings.append(f"YouTube research failed: {result}")
                continue
            for v in result:
                videos.setdefault(v.url, v)
        if not videos:
            warnings.append("No YouTube results were found, so there is no market evidence behind these ideas.")
        return sorted(videos.values(), key=lambda v: v.views or 0, reverse=True), queries

    @staticmethod
    def _market_summary(videos: List[VideoInfo]) -> Dict[str, Any]:
        views = [v.views for v in videos if v.views is not None]
        creators: Dict[str, Dict[str, Any]] = {}
        for v in videos:
            if not v.creator:
                continue
            c = creators.setdefault(v.creator, {"name": v.creator, "videos": 0, "total_views": 0})
            c["videos"] += 1
            c["total_views"] += v.views or 0
        top_creators = sorted(creators.values(), key=lambda c: c["total_views"], reverse=True)[:5]
        durations = [v.duration for v in videos if v.duration]
        return {
            "videos_found": len(videos),
            "median_views": int(statistics.median(views)) if views else None,
            "max_views": max(views) if views else None,
            "short_form_share": round(sum(1 for d in durations if d <= 60) / len(durations), 2) if durations else None,
            "median_duration_seconds": int(statistics.median(durations)) if durations else None,
            "top_creators": top_creators,
        }

    async def _generate_with_ai(self, niche, audience, request, videos, market, count, formats) -> List[Dict[str, Any]]:
        lines = [
            f"NICHE: {niche}",
            f"TARGET AUDIENCE: {audience or 'not specified'}",
            f"PLATFORMS: {', '.join(p.value for p in request.platforms)}",
            f"LANGUAGE / COUNTRY: {request.language} / {request.country}",
            f"PREFERRED FORMATS: {', '.join(formats)}",
            "",
            f"MARKET SUMMARY (YouTube search): {market}",
            "",
            "EXISTING VIDEOS (title | creator | views | duration s | url):",
        ]
        for v in videos[:25]:
            lines.append(f"- {v.title} | {v.creator} | {v.views} | {v.duration} | {v.url}")
        lines += [
            "",
            f"Propose {count} distinct video opportunities this creator could win: gaps the existing videos leave,",
            "underserved angles, or formats nobody is using. Return JSON:",
            '{"opportunities": [{"title": str, "topic_description": str, "target_audience": str,',
            ' "audience_need": str, "market_evidence": str (cite the videos above), "trend_signals": [str],',
            ' "content_gaps": [str], "creative_formats": [one or more of STICKMAN, DOODLE, WHITEBOARD, CARTOON,',
            ' MOTION_GRAPHICS, CINEMATIC, DOCUMENTARY, EDUCATIONAL], "potential_hooks": [3 str],',
            ' "risks": [str], "recommended_actions": [str], "confidence_level": 0-1,',
            ' "scores": {"market_interest": 0-1, "trend_momentum": 0-1, "audience_relevance": 0-1,',
            ' "content_saturation": 0-1 (1 = crowded), "creative_potential": 0-1, "production_feasibility": 0-1},',
            ' "reference_video_urls": [urls copied exactly from the list above that are worth studying]}]}',
        ]
        data = await llm.complete_json(SYSTEM_PROMPT, "\n".join(lines), max_tokens=6000)
        items = data.get("opportunities")
        if not isinstance(items, list) or not items:
            raise llm.LLMError("Model returned no opportunities")
        return [i for i in items if isinstance(i, dict)]

    @staticmethod
    def _generate_from_template(niche, audience, videos, market, count, formats) -> List[Dict[str, Any]]:
        """No LLM: one opportunity per strong existing video ("make the better version")."""
        top = sorted((v for v in videos if v.views), key=lambda v: v.views, reverse=True)
        median = market.get("median_views") or 0
        items: List[Dict[str, Any]] = []
        for v in top[:count]:
            interest = min(1.0, math.log10(max(v.views, 10)) / 7)  # 10M views ~ 1.0
            items.append({
                "title": f"A better take on: {v.title}"[:300],
                "topic_description": f"\"{v.title}\" by {v.creator} reached {v.views:,} views. Cover the same "
                                     f"question for {audience or 'your audience'} with a clearer structure and a stronger hook.",
                "target_audience": audience,
                "audience_need": f"Viewers searching for {niche} already watch this topic; give them a more useful answer.",
                "market_evidence": f"{v.views:,} views vs. a median of {median:,} across {len(videos)} videos found for \"{niche}\".",
                "content_gaps": ["Set up an AI provider to get gap analysis."],
                "creative_formats": formats,
                "potential_hooks": [f"What \"{v.title}\" got wrong", f"The {niche} answer in under 60 seconds"],
                "risks": ["Template output: validate the angle before producing."],
                "recommended_actions": ["Watch the reference video", "Note what the comments ask for"],
                "confidence_level": 0.35,
                "scores": {
                    "market_interest": interest, "trend_momentum": 0.5, "audience_relevance": 0.5,
                    "content_saturation": 0.6, "creative_potential": 0.5, "production_feasibility": 0.7,
                },
                "reference_video_urls": [v.url],
            })
        if not items:
            items.append({
                "title": f"{niche}: beginner's guide",
                "topic_description": f"An introductory video on {niche}.",
                "target_audience": audience,
                "audience_need": "No market data was available; treat this as a starting point.",
                "market_evidence": "No YouTube results were found.",
                "creative_formats": formats,
                "confidence_level": 0.2,
                "scores": {},
            })
        return items
