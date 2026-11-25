"""
Creative Strategy Service - Module 6
Generates original creative strategies from research data and reference DNA.
"""

import uuid
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.strategy import CreativeStrategy
from app.models.project import Project
from app.models.investigation import Investigation
from app.models.knowledge import KnowledgeEntry
from app.services.creative_strategy.schemas import (
    CreativeStrategyGenerationRequest,
    CreativeStrategyGenerationResponse,
    CreativeStrategyDraft,
    StrategyGenerationOptions,
)

logger = logging.getLogger(__name__)


class CreativeStrategyService:
    """Service for generating creative strategies from research data."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_strategy(
        self,
        request: CreativeStrategyGenerationRequest,
        options: Optional[StrategyGenerationOptions] = None,
    ) -> CreativeStrategyGenerationResponse:
        """
        Generate a creative strategy from research data and reference DNA.

        This combines:
        - User's concept and topic
        - Target audience analysis
        - Research findings from Modules 1-5
        - Reference DNA from Module 5 (multi-reference intelligence)
        - Platform-specific adaptations
        """
        if options is None:
            options = StrategyGenerationOptions()

        # Gather research context
        research_data = await self._gather_research_context(request)

        # Generate strategy using AI
        draft = await self._generate_strategy_with_ai(request, research_data, options)

        # Create and save strategy
        strategy = CreativeStrategy(
            project_id=request.project_id,
            concept=request.concept,
            topic=request.topic,
            target_audience=request.target_audience,
            creative_angle=draft.creative_angle,
            core_message=draft.core_message,
            emotional_objective=draft.emotional_objective,
            hook_direction=draft.hook_direction,
            narrative_formula=draft.narrative_formula,
            visual_style=draft.visual_style,
            animation_style=draft.animation_style,
            duration=draft.duration,
            platform_adaptations=draft.platform_adaptations,
            differentiation=draft.differentiation,
            alternatives=draft.alternatives,
        )

        self.db.add(strategy)
        await self.db.commit()
        await self.db.refresh(strategy)

        return CreativeStrategyGenerationResponse(
            strategy_id=strategy.id,
            concept=strategy.concept,
            topic=strategy.topic,
            target_audience=strategy.target_audience,
            creative_angle=strategy.creative_angle,
            core_message=strategy.core_message,
            emotional_objective=strategy.emotional_objective,
            hook_direction=strategy.hook_direction,
            narrative_formula=strategy.narrative_formula,
            visual_style=strategy.visual_style,
            animation_style=strategy.animation_style,
            duration=strategy.duration,
            platform_adaptations=strategy.platform_adaptations,
            differentiation=strategy.differentiation,
            alternatives=strategy.alternatives,
            is_approved=strategy.is_approved,
            created_at=strategy.created_at,
        )

    async def _gather_research_context(
        self,
        request: CreativeStrategyGenerationRequest,
    ) -> Dict[str, Any]:
        """Gather all relevant research data for strategy generation."""
        context = {
            "user_research": request.research_context or {},
            "reference_dna": request.reference_dna or {},
            "investigations": [],
            "knowledge_entries": [],
            "opportunities": [],
        }

        # Fetch investigations for this project
        result = await self.db.execute(
            select(Investigation)
            .where(Investigation.project_id == request.project_id)
            .order_by(Investigation.created_at.desc())
            .limit(10)
        )
        investigations = result.scalars().all()
        context["investigations"] = [
            {
                "id": str(inv.id),
                "type": inv.analysis_type,
                "findings": inv.findings,
                "confidence": inv.confidence_score,
            }
            for inv in investigations
        ]

        # Fetch knowledge entries
        result = await self.db.execute(
            select(KnowledgeEntry)
            .where(KnowledgeEntry.project_id == request.project_id)
            .order_by(KnowledgeEntry.created_at.desc())
            .limit(20)
        )
        knowledge = result.scalars().all()
        context["knowledge_entries"] = [
            {
                "id": str(k.id),
                "type": k.entry_type,
                "content": k.content,
                "tags": k.tags,
            }
            for k in knowledge
        ]

        return context

    async def _generate_strategy_with_ai(
        self,
        request: CreativeStrategyGenerationRequest,
        research_data: Dict[str, Any],
        options: StrategyGenerationOptions,
    ) -> CreativeStrategyDraft:
        """Generate strategy draft using AI providers."""

        # Build comprehensive prompt
        prompt = self._build_strategy_prompt(request, research_data)

        # Try AI generation
        try:
            if options.use_openai:
                return await self._generate_with_openai(prompt, options)
            elif options.use_anthropic:
                return await self._generate_with_anthropic(prompt, options)
        except Exception as e:
            logger.warning(f"AI generation failed, using template fallback: {e}")

        # Fallback to template-based generation
        return self._generate_template_strategy(request, research_data)

    def _build_strategy_prompt(
        self,
        request: CreativeStrategyGenerationRequest,
        research_data: Dict[str, Any],
    ) -> str:
        """Build comprehensive prompt for AI strategy generation."""

        prompt_parts = [
            f"Generate a comprehensive creative strategy for a content piece.",
            f"",
            f"CORE CONCEPT: {request.concept}",
            f"TOPIC/NICHE: {request.topic}",
            f"TARGET AUDIENCE: {request.target_audience}",
            f"PREFERRED DURATION: {request.duration_preference} seconds",
            f"TONE: {request.tone}",
            f"FORMAT PREFERENCE: {request.format_preference}",
            f"TARGET PLATFORMS: {', '.join(request.platform_targets)}",
            f"",
            f"RESEARCH CONTEXT:",
        ]

        # Add user research
        if research_data.get("user_research"):
            prompt_parts.append(f"User Research: {json.dumps(research_data['user_research'], indent=2)}")

        # Add reference DNA
        if research_data.get("reference_dna"):
            prompt_parts.append(f"Reference DNA (Multi-Ref Intelligence): {json.dumps(research_data['reference_dna'], indent=2)}")

        # Add investigations
        if research_data.get("investigations"):
            prompt_parts.append(f"Investigation Findings:")
            for inv in research_data["investigations"]:
                prompt_parts.append(f"  - {inv['type']}: {json.dumps(inv['findings'])}")

        # Add knowledge entries
        if research_data.get("knowledge_entries"):
            prompt_parts.append(f"Knowledge Base:")
            for k in research_data["knowledge_entries"][:10]:
                prompt_parts.append(f"  - {k['type']}: {k['content'][:500]}")

        prompt_parts.extend([
            f"",
            f"Generate a strategy with these components (return as JSON):",
            f"1. creative_angle: Unique angle/approach for this content",
            f"2. core_message: Single sentence core message",
            f"3. emotional_objective: Target emotional response",
            f"4. hook_direction: Specific hook strategy for first 3 seconds",
            f"5. narrative_formula: Story structure (e.g., 'Problem-Agitate-Solve', 'Hero Journey')",
            f"6. visual_style: Visual aesthetic description",
            f"7. animation_style: Animation approach",
            f"8. duration: Exact duration in seconds",
            f"9. platform_adaptations: Object with platform-specific tweaks",
            f"10. differentiation: How this stands out from competitors",
            f"11. alternatives: 2-3 alternative angles/approaches",
        ])

        return "\n".join(prompt_parts)

    async def _generate_with_openai(
        self,
        prompt: str,
        options: StrategyGenerationOptions,
    ) -> CreativeStrategyDraft:
        """Generate strategy using OpenAI."""
        try:
            from openai import AsyncOpenAI
            from app.core.config import settings

            if not settings.OPENAI_API_KEY:
                raise ValueError("OpenAI API key not configured")

            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            response = await client.chat.completions.create(
                model=options.llm_model,
                messages=[
                    {"role": "system", "content": "You are an expert creative strategist for viral content. Generate detailed, actionable creative strategies in JSON format."},
                    {"role": "user", "content": prompt},
                ],
                temperature=options.temperature,
                max_tokens=options.max_tokens,
                response_format={"type": "json_object"},
            )

            result = json.loads(response.choices[0].message.content)
            return CreativeStrategyDraft(**result)

        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")
            raise

    async def _generate_with_anthropic(
        self,
        prompt: str,
        options: StrategyGenerationOptions,
    ) -> CreativeStrategyDraft:
        """Generate strategy using Anthropic Claude."""
        try:
            import anthropic
            from app.core.config import settings

            if not settings.ANTHROPIC_API_KEY:
                raise ValueError("Anthropic API key not configured")

            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

            response = await client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=options.max_tokens,
                temperature=options.temperature,
                system="You are an expert creative strategist for viral content. Generate detailed, actionable creative strategies in JSON format.",
                messages=[{"role": "user", "content": prompt}],
            )

            result = json.loads(response.content[0].text)
            return CreativeStrategyDraft(**result)

        except Exception as e:
            logger.error(f"Anthropic generation failed: {e}")
            raise

    def _generate_template_strategy(
        self,
        request: CreativeStrategyGenerationRequest,
        research_data: Dict[str, Any],
    ) -> CreativeStrategyDraft:
        """Template-based strategy generation as fallback."""

        # Extract key insights from research
        hook_insights = self._extract_hook_insights(research_data)
        visual_insights = self._extract_visual_insights(research_data)
        narrative_insights = self._extract_narrative_insights(research_data)

        # Generate platform adaptations
        platform_adaptations = {}
        for platform in request.platform_targets:
            platform_adaptations[platform] = self._get_platform_adaptation(
                platform, request.duration_preference, request.format_preference
            )

        return CreativeStrategyDraft(
            creative_angle=f"Data-driven {request.format_preference} approach for {request.topic}",
            core_message=f"Master {request.topic} with proven frameworks that actually work",
            emotional_objective="Empowerment and curiosity - viewer feels capable and intrigued",
            hook_direction=hook_insights or "Open with a counter-intuitive claim + visual proof",
            narrative_formula=narrative_insights or "Hook → Problem → Solution → Proof → CTA",
            visual_style=visual_insights or "Clean educational style with dynamic text overlays",
            animation_style="Smooth transitions, kinetic typography, data visualizations",
            duration=request.duration_preference,
            platform_adaptations=platform_adaptations,
            differentiation="Combines multi-reference pattern analysis with audience psychology",
            alternatives={
                "alternative_1": "Story-driven case study format",
                "alternative_2": "Rapid-fire tips compilation",
                "alternative_3": "Myth-busting reactive format",
            },
        )

    def _extract_hook_insights(self, research_data: Dict[str, Any]) -> Optional[str]:
        """Extract hook insights from research data."""
        # Check reference DNA for hook patterns
        ref_dna = research_data.get("reference_dna", {})
        if ref_dna.get("hook_patterns"):
            patterns = ref_dna["hook_patterns"]
            if isinstance(patterns, list) and patterns:
                return f"Use proven hook pattern: {patterns[0]}"
        return None

    def _extract_visual_insights(self, research_data: Dict[str, Any]) -> Optional[str]:
        """Extract visual style insights from research data."""
        ref_dna = research_data.get("reference_dna", {})
        if ref_dna.get("visual_patterns"):
            patterns = ref_dna["visual_patterns"]
            if isinstance(patterns, list) and patterns:
                return f"Apply proven visual style: {patterns[0]}"
        return None

    def _extract_narrative_insights(self, research_data: Dict[str, Any]) -> Optional[str]:
        """Extract narrative structure insights from research data."""
        ref_dna = research_data.get("reference_dna", {})
        if ref_dna.get("narrative_structures"):
            structures = ref_dna["narrative_structures"]
            if isinstance(structures, list) and structures:
                return structures[0]
        return None

    def _get_platform_adaptation(
        self,
        platform: str,
        duration: int,
        format_type: str,
    ) -> Dict[str, Any]:
        """Get platform-specific adaptations."""
        adaptations = {
            "youtube": {
                "duration": min(duration, 600),
                "aspect_ratio": "16:9",
                "hooks": ["Strong visual hook at 0s", "Chapter markers", "End screen CTA"],
                "format_notes": "Long-form educational, SEO-optimized titles",
            },
            "tiktok": {
                "duration": min(duration, 180),
                "aspect_ratio": "9:16",
                "hooks": ["Immediate visual + audio sync", "Text overlay hook", "Loop-friendly ending"],
                "format_notes": "Fast-paced, trending sounds, native text",
            },
            "instagram": {
                "duration": min(duration, 90),
                "aspect_ratio": "9:16",
                "hooks": ["Aesthetic opening", "Save-worthy value", "Shareable insight"],
                "format_notes": "Reels format, carousel-friendly, aesthetic-first",
            },
            "linkedin": {
                "duration": min(duration, 300),
                "aspect_ratio": "16:9",
                "hooks": ["Professional authority signal", "Business value upfront"],
                "format_notes": "Thought leadership, professional polish",
            },
        }
        return adaptations.get(platform, adaptations["youtube"])

    async def approve_strategy(self, strategy_id: uuid.UUID, approved: bool, feedback: Optional[str] = None) -> CreativeStrategy:
        """Approve or reject a creative strategy."""
        result = await self.db.execute(
            select(CreativeStrategy).where(CreativeStrategy.id == strategy_id)
        )
        strategy = result.scalar_one_or_none()
        if not strategy:
            raise ValueError(f"Strategy {strategy_id} not found")

        strategy.is_approved = approved
        strategy.approved_at = datetime.now(timezone.utc) if approved else None
        # Store feedback in a note field or separate table if needed

        await self.db.commit()
        await self.db.refresh(strategy)
        return strategy

    async def get_strategy(self, strategy_id: uuid.UUID) -> Optional[CreativeStrategy]:
        """Get a strategy by ID."""
        result = await self.db.execute(
            select(CreativeStrategy).where(CreativeStrategy.id == strategy_id)
        )
        return result.scalar_one_or_none()

    async def list_strategies(self, project_id: uuid.UUID) -> List[CreativeStrategy]:
        """List all strategies for a project."""
        result = await self.db.execute(
            select(CreativeStrategy)
            .where(CreativeStrategy.project_id == project_id)
            .order_by(CreativeStrategy.created_at.desc())
        )
        return result.scalars().all()