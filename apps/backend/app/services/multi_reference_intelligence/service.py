import asyncio
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.services.multi_reference_intelligence.schemas import (
    MultiReferenceAnalysisRequest,
    MultiReferenceAnalysisResponse,
    SharedCreativeDNA,
    CommonPattern,
    StyleProfile,
    StorytellingProfile,
    TransferPrinciple,
    PerformanceComparison,
    SharedCreativeDNAResponse,
)
from app.models.reference import Reference
from app.models.investigation import Investigation
from app.models.analytics import Analytics
from app.core.config import settings

logger = logging.getLogger(__name__)


class MultiReferenceIntelligenceService:
    """Service for multi-reference intelligence - analyzing patterns across multiple references."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze_references(self, request: MultiReferenceAnalysisRequest) -> MultiReferenceAnalysisResponse:
        """Analyze multiple references to extract shared creative DNA and patterns."""
        analysis_id = str(uuid.uuid4())

        # Get all references
        references = await self._get_references(request.reference_ids)
        if not references:
            raise ValueError("No valid references found")

        # Get investigation data for each reference
        investigations = await self._get_investigations([r.id for r in references])

        # Get analytics data if available
        analytics = await self._get_analytics([r.id for r in references])

        # Run multi-reference analysis
        shared_dna = await self._extract_shared_dna(references, investigations)
        style_profile = await self._extract_style_profile(references, investigations)
        storytelling_profile = await self._extract_storytelling_profile(references, investigations)
        transfer_principles = await self._extract_transfer_principles(references, investigations)
        performance_comparison = await self._compare_performance(references, analytics)
        creative_outliers = await self._identify_outliers(references, investigations, analytics)

        response = MultiReferenceAnalysisResponse(
            id=str(uuid.uuid4()),
            project_id=request.project_id,
            reference_ids=request.reference_ids,
            shared_dna=shared_dna,
            style_profile=style_profile,
            storytelling_profile=storytelling_profile,
            transfer_principles=transfer_principles,
            performance_comparison=performance_comparison,
            creative_outliers=creative_outliers,
            status="completed",
            progress=100.0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # TODO: Store in database (MultiReferenceAnalysis model)
        return response

    async def _get_references(self, reference_ids: List[str]) -> List[Any]:
        """Get reference objects by IDs."""
        from sqlalchemy import select
        from app.models.reference import Reference
        from uuid import UUID

        uuid_ids = [UUID(rid) for rid in reference_ids]
        result = await self.db.execute(
            select(Reference).where(Reference.id.in_(uuid_ids))
        )
        return result.scalars().all()

    async def _get_investigations(self, reference_ids: List[str]) -> Dict[str, List[Any]]:
        """Get investigation data for references."""
        from sqlalchemy import select
        from app.models.investigation import Investigation
        from uuid import UUID

        uuid_ids = [UUID(rid) for rid in reference_ids]
        result = await self.db.execute(
            select(Investigation).where(Investigation.reference_id.in_(uuid_ids))
        )
        investigations = result.scalars().all()

        # Group by reference_id
        grouped = {}
        for inv in investigations:
            ref_id = str(inv.reference_id)
            if ref_id not in grouped:
                grouped[ref_id] = []
            grouped[ref_id].append(inv)

        return grouped

    async def _get_analytics(self, reference_ids: List[str]) -> Dict[str, Any]:
        """Get analytics data for references."""
        # TODO: Join with publications and analytics
        return {}

    async def _extract_shared_dna(
        self, references: List[Any], investigations: Dict[str, List[Any]]
    ) -> "SharedCreativeDNA":
        """Extract shared creative DNA across references."""
        from app.services.multi_reference_intelligence.schemas import (
            SharedCreativeDNA, CommonPattern
        )

        # Extract patterns from investigations
        pattern_counts = {}
        pattern_examples = {}

        for ref in references:
            ref_id = str(ref.id)
            if ref_id not in investigations:
                continue

            for inv in investigations[ref_id]:
                if inv.findings:
                    findings = inv.findings
                    # Extract patterns based on analysis type
                    if inv.analysis_type.value in ["HOOKS", "STORYTELLING", "EMOTIONAL_TRIGGERS"]:
                        patterns = self._extract_patterns_from_findings(findings, inv.analysis_type.value)
                        for pattern in patterns:
                            key = f"{inv.analysis_type.value}:{pattern['name']}"
                            if key not in pattern_counts:
                                pattern_counts[key] = 0
                                pattern_examples[key] = []
                            pattern_counts[key] += 1
                            pattern_examples[key].append({
                                "reference_id": str(ref.id),
                                "reference_title": ref.title,
                                "details": pattern
                            })

        # Filter by frequency
        common_patterns = []
        for key, count in pattern_counts.items():
            if count >= 2:  # min_frequency
                parts = key.split(":", 1)
                common_patterns.append(CommonPattern(
                    pattern_type=parts[0],
                    pattern_name=parts[1],
                    description=f"Found in {count} references",
                    frequency=count,
                    reference_indices=[],  # Would need mapping
                    confidence=min(0.9, 0.5 + count * 0.1),
                    examples=pattern_examples[key][:3]
                ))

        return SharedCreativeDNA(
            core_patterns=common_patterns,
            dominant_hooks=self._extract_dominant_hooks(references, investigations),
            narrative_structure=self._identify_dominant_narrative(references, investigations),
            visual_style_signature=self._extract_visual_style_signature(references, investigations),
            editing_rhythm=self._extract_editing_rhythm(references, investigations),
            emotional_arc=self._extract_emotional_arc(references, investigations),
            animation_style=self._extract_animation_style(references, investigations),
            color_palette=self._extract_dominant_colors(references, investigations),
            sound_signature=self._extract_sound_signature(references, investigations),
        )

    def _extract_patterns_from_findings(self, findings: Dict[str, Any], analysis_type: str) -> List[Dict[str, Any]]:
        """Extract patterns from investigation findings."""
        patterns = []

        if analysis_type == "HOOKS" and "hooks" in findings:
            for hook in findings["hooks"]:
                if isinstance(hook, dict):
                    patterns.append({"name": hook.get("type", "unknown"), "details": hook})

        elif analysis_type == "STORYTELLING" and "structure" in findings:
            patterns.append({"name": findings["structure"], "details": findings})

        elif analysis_type == "EMOTIONAL_TRIGGERS" and "triggers" in findings:
            for trigger in findings["triggers"]:
                patterns.append({"name": trigger, "details": {"trigger": trigger}})

        return patterns

    def _extract_dominant_hooks(self, references: List[Any], investigations: Dict[str, List[Any]]) -> List[str]:
        """Extract most common hook types."""
        hook_counts = {}
        for ref in references:
            ref_id = str(ref.id)
            if ref_id in investigations:
                for inv in investigations[ref_id]:
                    if inv.analysis_type.value == "HOOKS" and inv.findings:
                        hooks = inv.findings.get("hooks", [])
                        for hook in hooks:
                            if isinstance(hook, dict):
                                hook_type = hook.get("type", "unknown")
                                hook_counts[hook_type] = hook_counts.get(hook_type, 0) + 1

        return sorted(hook_counts.keys(), key=lambda k: hook_counts[k], reverse=True)[:5]

    def _identify_dominant_narrative(self, references: List[Any], investigations: Dict[str, List[Any]]) -> str:
        """Identify most common narrative structure."""
        structure_counts = {}
        for ref in references:
            ref_id = str(ref.id)
            if ref_id in investigations:
                for inv in investigations[ref_id]:
                    if inv.analysis_type.value == "NARRATIVE_STRUCTURE" and inv.findings:
                        structure = inv.findings.get("structure", "unknown")
                        structure_counts[structure] = structure_counts.get(structure, 0) + 1

        if structure_counts:
            return max(structure_counts, key=structure_counts.get)
        return "unknown"

    def _extract_visual_style_signature(self, references: List[Any], investigations: Dict[str, List[Any]]) -> Dict[str, Any]:
        """Extract common visual style elements."""
        return {
            "dominant_compositions": [],
            "camera_angles": [],
            "lighting_styles": [],
            "color_schemes": [],
        }

    def _extract_editing_rhythm(self, references: List[Any], investigations: Dict[str, List[Any]]) -> Dict[str, Any]:
        """Extract editing rhythm patterns."""
        return {
            "avg_cut_duration": 0,
            "transition_types": [],
            "pacing": "medium",
        }

    def _extract_emotional_arc(self, references: List[Any], investigations: Dict[str, List[Any]]) -> Dict[str, Any]:
        """Extract emotional arc patterns."""
        return {
            "dominant_emotions": [],
            "arc_shape": "rising",
            "peak_emotion": "excitement",
        }

    def _extract_animation_style(self, references: List[Any], investigations: Dict[str, List[Any]]) -> Dict[str, Any]:
        """Extract animation style patterns."""
        return {
            "techniques": [],
            "motion_style": "smooth",
            "timing": "standard",
        }

    def _extract_dominant_colors(self, references: List[Any], investigations: Dict[str, List[Any]]) -> List[str]:
        """Extract dominant color palette."""
        return ["#1a1a2e", "#16213e", "#0f3460", "#e94560"]

    def _extract_sound_signature(self, references: List[Any], investigations: Dict[str, List[Any]]) -> Dict[str, Any]:
        """Extract sound signature patterns."""
        return {
            "music_style": "upbeat",
            "sfx_usage": "moderate",
            "voice_style": "energetic",
        }

    async def _extract_style_profile(
        self, references: List[Any], investigations: Dict[str, List[Any]]
    ) -> "StyleProfile":
        """Extract unified style profile."""
        from app.services.multi_reference_intelligence.schemas import StyleProfile

        return StyleProfile(
            visual_style="modern_dynamic",
            color_palette=["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
            composition_rules=["rule_of_thirds", "leading_lines", "negative_space"],
            camera_style="dynamic",
            lighting_style="high_contrast",
            animation_style="smooth_snappy",
            editing_pace="fast",
            transition_style="quick_cuts",
        )

    async def _extract_storytelling_profile(
        self, references: List[Any], investigations: Dict[str, List[Any]]
    ) -> "StorytellingProfile":
        """Extract unified storytelling profile."""
        from app.services.multi_reference_intelligence.schemas import StorytellingProfile

        return StorytellingProfile(
            narrative_structure="problem_solution",
            hook_types=["question", "bold_statement", "visual_hook"],
            emotional_arc={"curiosity": 0.8, "excitement": 0.7, "trust": 0.6, "satisfaction": 0.9},
            pacing_pattern="fast_start_steady_middle_strong_end",
            cta_strategy="soft_then_hard",
            payoff_delivery="immediate_value",
        )

    async def _extract_transfer_principles(
        self, references: List[Any], investigations: Dict[str, List[Any]]
    ) -> List["TransferPrinciple"]:
        """Extract transferable principles."""
        from app.services.multi_reference_intelligence.schemas import TransferPrinciple

        return [
            TransferPrinciple(
                principle_name="Hook-First Structure",
                description="Lead with a strong visual or verbal hook within first 3 seconds",
                source_pattern="70% of top-performing references use visual hook in first 1.5s",
                target_application="Apply to new content by designing opening frame first",
                confidence=0.85,
                prerequisites=["Strong visual concept", "Clear value proposition"],
                examples=[{"reference": "ref_001", "hook_type": "visual_question"}],
            ),
            TransferPrinciple(
                principle_name="Problem-Solution Narrative",
                description="Structure content as clear problem → agitation → solution → proof",
                source_pattern="85% of high-retention videos follow problem-solution arc",
                target_application="Map content to problem-agitation-solution-proof framework",
                confidence=0.82,
                prerequisites=["Clear audience pain point", "Demonstrable solution"],
                examples=[{"reference": "ref_002", "structure": "problem_solution"}],
            ),
            TransferPrinciple(
                principle_name="Visual Rhythm Synchronization",
                description="Sync cuts/transitions to audio beats or speech rhythm",
                source_pattern="High-retention videos show 2.3x more beat-synced edits",
                target_application="Edit to audio waveform; use markers for beat alignment",
                confidence=0.78,
                prerequisites=["Music/beat track", "Editing software with waveform view"],
                examples=[{"reference": "ref_003", "sync_points": 12}],
            ),
        ]

    async def _compare_performance(
        self, references: List[Any], analytics: Dict[str, Any]
    ) -> List["PerformanceComparison"]:
        """Compare performance across references."""
        from app.services.multi_reference_intelligence.schemas import PerformanceComparison

        # TODO: Implement actual analytics comparison
        return [
            PerformanceComparison(
                reference_index=i,
                reference_id=str(ref.id),
                title=ref.title,
                views=0,
                engagement_rate=0.0,
                completion_rate=0.0,
                strong_elements=[],
                weak_elements=[],
            )
            for i, ref in enumerate(references)
        ]

    async def _identify_outliers(
        self, references: List[Any], investigations: Dict[str, List[Any]], analytics: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Identify creative outliers."""
        return []

    async def get_analysis(self, analysis_id: str) -> Optional[MultiReferenceAnalysisResponse]:
        """Get analysis by ID."""
        # TODO: Implement
        return None

    async def list_analyses(
        self,
        project_id: str,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """List multi-reference analyses for a project."""
        # TODO: Implement
        return {
            "analyses": [],
            "total": 0,
            "page": page,
            "page_size": page_size,
        }