"""
Production Studio Service - Module 7
Generates production assets (scripts, storyboards, voiceovers, visuals) from approved creative strategies.
"""

import uuid
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.production import Production, CreativeFormat
from app.models.strategy import CreativeStrategy
from app.services import llm
from app.models.project import Project
from app.services.production_studio.schemas import (
    ProductionGenerationRequest,
    ProductionGenerationResponse,
    ProductionAssetRequest,
    ProductionAssetResponse,
    ProductionQueueItem,
)

logger = logging.getLogger(__name__)


class ProductionStudioService:
    """Service for generating production assets from creative strategies."""

    ASSET_FIELDS = (
        "script", "hooks", "voiceover", "storyboard", "character_designs",
        "animation_instructions", "visual_prompts", "image_assets", "video_assets",
        "sound_design", "music_direction", "editing_instructions", "captions",
        "subtitles", "timeline",
    )

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_production(
        self,
        request: ProductionGenerationRequest,
    ) -> ProductionGenerationResponse:
        """
        Generate complete production package from an approved creative strategy.

        Creates:
        - Script with hooks and structure
        - Storyboard with visual descriptions
        - Voiceover script with timing
        - Character designs (if applicable)
        - Animation instructions
        - Visual prompts for AI image generation
        - Sound design and music direction
        - Editing instructions
        - Captions and subtitles
        - Production timeline
        """
        # Verify strategy exists and is approved
        result = await self.db.execute(
            select(CreativeStrategy).where(CreativeStrategy.id == request.strategy_id)
        )
        strategy = result.scalar_one_or_none()
        if not strategy:
            raise ValueError(f"Strategy {request.strategy_id} not found")
        if not strategy.is_approved:
            raise ValueError("Strategy must be approved before production")

        # Verify format is valid
        try:
            format_enum = CreativeFormat(request.format)
        except ValueError:
            raise ValueError(f"Invalid format: {request.format}")

        # Generate production assets using AI
        assets = await self._generate_production_assets(strategy, format_enum, request)

        # Create production record
        production = Production(
            project_id=strategy.project_id,
            strategy_id=request.strategy_id,
            format=format_enum,
            **assets,
        )

        self.db.add(production)
        await self.db.commit()
        await self.db.refresh(production)

        return ProductionGenerationResponse(
            production_id=production.id,
            strategy_id=production.strategy_id,
            format=production.format.value,
            script=production.script,
            hooks=production.hooks,
            voiceover=production.voiceover,
            storyboard=production.storyboard,
            character_designs=production.character_designs,
            animation_instructions=production.animation_instructions,
            visual_prompts=production.visual_prompts,
            image_assets=production.image_assets,
            video_assets=production.video_assets,
            sound_design=production.sound_design,
            music_direction=production.music_direction,
            editing_instructions=production.editing_instructions,
            captions=production.captions,
            subtitles=production.subtitles,
            timeline=production.timeline,
            version=production.version,
            status=production.status,
            created_at=production.created_at,
        )

    async def _generate_production_assets(
        self,
        strategy: CreativeStrategy,
        format_enum: CreativeFormat,
        request: ProductionGenerationRequest,
    ) -> Dict[str, Any]:
        """Generate all production assets for the given strategy and format."""

        # Try AI generation first
        try:
            raw = await self._generate_with_ai(strategy, format_enum, request)
        except llm.LLMUnavailable:
            logger.info("No LLM provider configured, using template production")
            raw = self._generate_template_assets(strategy, format_enum, request)
        except Exception as e:
            logger.warning(f"AI generation failed, using template fallback: {e}")
            raw = self._generate_template_assets(strategy, format_enum, request)

        # LLM output is untrusted: keep only known JSONB asset columns, coerce to dicts
        return {
            field: raw[field] if isinstance(raw.get(field), dict) else {}
            for field in self.ASSET_FIELDS
        }

    async def _generate_with_ai(
        self,
        strategy: CreativeStrategy,
        format_enum: CreativeFormat,
        request: ProductionGenerationRequest,
    ) -> Dict[str, Any]:
        """Generate production assets with the configured LLM provider."""
        prompt = self._build_production_prompt(strategy, format_enum, request)
        return await llm.complete_json(
            "You are an expert production designer for viral video content. "
            "Generate detailed, production-ready packages.",
            prompt,
            max_tokens=8000,
        )

    def _build_production_prompt(
        self,
        strategy: CreativeStrategy,
        format_enum: CreativeFormat,
        request: ProductionGenerationRequest,
    ) -> str:
        """Build comprehensive prompt for AI production generation."""

        platform_notes = strategy.platform_adaptations or {}

        prompt_parts = [
            f"Generate a complete production package for a {format_enum.value} format video.",
            f"",
            f"STRATEGY DETAILS:",
            f"Creative Angle: {strategy.creative_angle}",
            f"Core Message: {strategy.core_message}",
            f"Emotional Objective: {strategy.emotional_objective}",
            f"Hook Direction: {strategy.hook_direction}",
            f"Narrative Formula: {strategy.narrative_formula}",
            f"Visual Style: {strategy.visual_style}",
            f"Animation Style: {strategy.animation_style}",
            f"Duration: {strategy.duration} seconds",
            f"Differentiation: {strategy.differentiation}",
            f"",
            f"PLATFORM ADAPTATIONS: {json.dumps(platform_notes, indent=2)}",
            f"TARGET PLATFORMS: {', '.join(request.platform_targets)}",
            f"FORMAT: {format_enum.value}",
            f"",
            f"Generate JSON with these production assets:",
            f"1. script: {{scenes: [], dialogue: [], timing: []}}",
            f"2. hooks: {{opening: '', retention: [], cta: ''}}",
            f"3. voiceover: {{script: '', timing_marks: [], tone: ''}}",
            f"4. storyboard: {{frames: [{{\"time\": 0, \"visual\": \"\", \"audio\": \"\", \"text_overlay\": \"\"}}]}}",
            f"5. character_designs: {{characters: []}} (if format supports characters)",
            f"6. animation_instructions: {{style: '', transitions: [], effects: []}}",
            f"7. visual_prompts: {{prompts: [{{\"frame\": 0, \"prompt\": \"\", \"negative_prompt\": \"\"}}]}}",
            f"8. image_assets: {{needed: [], style_references: []}}",
            f"9. video_assets: {{stock_clips: [], b_roll: []}}",
            f"10. sound_design: {{sfx: [], ambient: [], transitions: []}}",
            f"11. music_direction: {{genre: '', mood: '', tempo: '', licensing: ''}}",
            f"12. editing_instructions: {{pacing: '', cuts: [], color_grade: ''}}",
            f"13. captions: {{style: '', position: '', animations: []}}",
            f"14. subtitles: {{languages: [], format: 'srt'}}",
            f"15. timeline: {{phases: [{{\"name\": \"pre-production\", \"duration_hours\": 2}}, {{\"name\": \"production\", \"duration_hours\": 4}}, {{\"name\": \"post-production\", \"duration_hours\": 3}}]}}",
        ]

        return "\n".join(prompt_parts)

    def _generate_template_assets(
        self,
        strategy: CreativeStrategy,
        format_enum: CreativeFormat,
        request: ProductionGenerationRequest,
    ) -> Dict[str, Any]:
        """Template-based production asset generation as fallback."""

        format_templates = {
            CreativeFormat.STICKMAN: self._stickman_template,
            CreativeFormat.DOODLE: self._doodle_template,
            CreativeFormat.WHITEBOARD: self._whiteboard_template,
            CreativeFormat.CARTOON: self._cartoon_template,
            CreativeFormat.MOTION_GRAPHICS: self._motion_graphics_template,
            CreativeFormat.CINEMATIC: self._cinematic_template,
            CreativeFormat.DOCUMENTARY: self._documentary_template,
            CreativeFormat.EDUCATIONAL: self._educational_template,
        }

        template_func = format_templates.get(format_enum, self._educational_template)
        return template_func(strategy, request)

    def _stickman_template(self, strategy: CreativeStrategy, request: ProductionGenerationRequest) -> Dict[str, Any]:
        """Stickman animation template."""
        return {
            "script": {
                "scenes": [
                    {"id": 1, "description": "Hook - stickman faces problem", "duration": 3},
                    {"id": 2, "description": "Problem demonstration", "duration": 8},
                    {"id": 3, "description": "Solution introduction", "duration": 10},
                    {"id": 4, "description": "Step-by-step walkthrough", "duration": 20},
                    {"id": 5, "description": "Result showcase", "duration": 10},
                    {"id": 6, "description": "CTA", "duration": 4},
                ],
                "dialogue": ["Problem?", "Here's how...", "Step 1...", "Result!", "Try it!"],
                "timing": [0, 3, 11, 21, 41, 51],
            },
            "hooks": {
                "opening": "Stickman struggling with relatable problem",
                "retention": ["Wait for the twist", "You won't believe step 3", "The result is crazy"],
                "cta": "Follow for more simple solutions",
            },
            "voiceover": {
                "script": "Ever struggle with this? Here's the simple fix. Step one... Step two... And boom - problem solved!",
                "timing_marks": [0, 3, 5, 15, 35, 50],
                "tone": "casual and encouraging",
            },
            "storyboard": {
                "frames": [
                    {"time": 0, "visual": "Stickman confused", "audio": "SFX: confused sound", "text_overlay": "Relatable problem"},
                    {"time": 3, "visual": "Problem visualization", "audio": "Music starts", "text_overlay": "Sound familiar?"},
                    {"time": 11, "visual": "Lightbulb moment", "audio": "Ding!", "text_overlay": "The Solution"},
                    {"time": 21, "visual": "Step by step demo", "audio": "Upbeat music", "text_overlay": "Step 1: ..."},
                    {"time": 41, "visual": "Happy stickman", "audio": "Success sound", "text_overlay": "Done!"},
                    {"time": 51, "visual": "CTA screen", "audio": "Outro music", "text_overlay": "Follow for more"},
                ]
            },
            "character_designs": {
                "characters": [
                    {"name": "Protagonist", "style": "Simple stick figure", "color": "#3B82F6", "expressions": ["confused", "thinking", "happy"]},
                ]
            },
            "animation_instructions": {
                "style": "Minimalist stick figure animation",
                "transitions": ["Quick cuts", "Morph transitions"],
                "effects": ["Text pop-in", "Arrow indicators", "Check marks"],
            },
            "visual_prompts": {
                "prompts": [
                    {"frame": 0, "prompt": "Simple stick figure character looking confused, minimal white background", "negative_prompt": "detailed, realistic, complex"},
                    {"frame": 1, "prompt": "Stick figure having lightbulb moment, clean minimal style", "negative_prompt": "detailed, realistic, complex"},
                ]
            },
            "image_assets": {
                "needed": ["Stickman character sheet", "Problem icons", "Solution icons", "UI elements"],
                "style_references": ["Minimal line art", "Flat design"],
            },
            "video_assets": {
                "stock_clips": [],
                "b_roll": [],
            },
            "sound_design": {
                "sfx": ["Pop", "Ding", "Whoosh", "Success chime"],
                "ambient": [],
                "transitions": ["Quick whoosh between scenes"],
            },
            "music_direction": {
                "genre": "Upbeat electronic",
                "mood": "Energetic, positive",
                "tempo": "120 BPM",
                "licensing": "Royalty-free",
            },
            "editing_instructions": {
                "pacing": "Fast, snappy cuts",
                "cuts": ["Jump cuts for steps", "Match cuts for transitions"],
                "color_grade": "Bright, high contrast",
            },
            "captions": {
                "style": "Bold, animated text",
                "position": "Bottom center",
                "animations": ["Typewriter", "Pop-in", "Slide up"],
            },
            "subtitles": {
                "languages": ["en", "es", "fr"],
                "format": "srt",
            },
            "timeline": {
                "phases": [
                    {"name": "pre-production", "duration_hours": 1},
                    {"name": "production", "duration_hours": 3},
                    {"name": "post-production", "duration_hours": 2},
                ]
            },
        }

    def _doodle_template(self, strategy: CreativeStrategy, request: ProductionGenerationRequest) -> Dict[str, Any]:
        """Doodle animation template."""
        base = self._stickman_template(strategy, request)
        base["animation_instructions"]["style"] = "Hand-drawn doodle style"
        base["visual_prompts"]["prompts"] = [
            {"frame": 0, "prompt": "Hand-drawn doodle style illustration, sketchy lines, white background", "negative_prompt": "clean vector, digital art"},
        ]
        base["character_designs"]["characters"][0]["style"] = "Hand-drawn doodle character"
        return base

    def _whiteboard_template(self, strategy: CreativeStrategy, request: ProductionGenerationRequest) -> Dict[str, Any]:
        """Whiteboard animation template."""
        base = self._stickman_template(strategy, request)
        base["animation_instructions"]["style"] = "Whiteboard drawing animation"
        base["visual_prompts"]["prompts"] = [
            {"frame": 0, "prompt": "Whiteboard drawing animation, hand drawing with marker, timelapse style", "negative_prompt": "digital, clean vector"},
        ]
        base["character_designs"]["characters"] = []
        base["sound_design"]["sfx"] = ["Marker squeak", "Eraser sound", "Writing sounds"]
        return base

    def _cartoon_template(self, strategy: CreativeStrategy, request: ProductionGenerationRequest) -> Dict[str, Any]:
        """Cartoon animation template."""
        base = self._stickman_template(strategy, request)
        base["animation_instructions"]["style"] = "2D cartoon animation"
        base["visual_prompts"]["prompts"] = [
            {"frame": 0, "prompt": "Cute 2D cartoon character, expressive, vibrant colors, cel shaded", "negative_prompt": "realistic, 3d, photorealistic"},
        ]
        base["character_designs"]["characters"][0]["style"] = "2D cartoon character"
        base["character_designs"]["characters"][0]["color"] = "#FF6B6B"
        return base

    def _motion_graphics_template(self, strategy: CreativeStrategy, request: ProductionGenerationRequest) -> Dict[str, Any]:
        """Motion graphics template."""
        return {
            "script": {
                "scenes": [
                    {"id": 1, "description": "Data visualization hook", "duration": 3},
                    {"id": 2, "description": "Problem stats", "duration": 8},
                    {"id": 3, "description": "Solution framework", "duration": 15},
                    {"id": 4, "description": "Animated process flow", "duration": 20},
                    {"id": 5, "description": "Results dashboard", "duration": 10},
                    {"id": 6, "description": "CTA with branding", "duration": 4},
                ],
                "dialogue": ["The data shows...", "Here's the framework", "Watch this process", "Results speak", "Learn more"],
                "timing": [0, 3, 11, 26, 46, 56],
            },
            "hooks": {
                "opening": "Shocking statistic visualized",
                "retention": ["The pattern emerges", "This changes everything", "Final metric will surprise you"],
                "cta": "Get the template in description",
            },
            "voiceover": {
                "script": "The data reveals a shocking pattern. Here's the framework that solves it. Watch the process unfold. The results speak for themselves.",
                "timing_marks": [0, 3, 5, 20, 40, 55],
                "tone": "Professional, authoritative",
            },
            "storyboard": {
                "frames": [
                    {"time": 0, "visual": "Animated chart/stat", "audio": "Data pulse sound", "text_overlay": "97% fail at this..."},
                    {"time": 3, "visual": "Problem breakdown", "audio": "Tension build", "text_overlay": "Why it fails"},
                    {"time": 11, "visual": "Framework reveal", "audio": "Resolve chord", "text_overlay": "The Framework"},
                    {"time": 26, "visual": "Process animation", "audio": "Steady beat", "text_overlay": "Step 1 → 2 → 3"},
                    {"time": 46, "visual": "Results dashboard", "audio": "Success swell", "text_overlay": "Results: 94% success"},
                    {"time": 56, "visual": "Brand CTA", "audio": "Outro", "text_overlay": "Get the template"},
                ]
            },
            "character_designs": {"characters": []},
            "animation_instructions": {
                "style": "Clean motion graphics, data-driven",
                "transitions": ["Smooth morphs", "Data transitions", "Grid wipes"],
                "effects": ["Counter animations", "Chart builds", "Kinetic typography"],
            },
            "visual_prompts": {
                "prompts": [
                    {"frame": 0, "prompt": "Clean motion graphics data visualization, animated charts, minimal design", "negative_prompt": "characters, organic, hand-drawn"},
                ]
            },
            "image_assets": {
                "needed": ["Chart templates", "Icon set", "UI elements", "Brand assets"],
                "style_references": ["Flat design", "Material design", "Data viz best practices"],
            },
            "video_assets": {"stock_clips": [], "b_roll": []},
            "sound_design": {
                "sfx": ["Data pulses", "Chart builds", "UI clicks", "Transition whooshes"],
                "ambient": ["Subtle tech ambience"],
                "transitions": ["Digital glitch", "Smooth morph"],
            },
            "music_direction": {
                "genre": "Corporate tech",
                "mood": "Confident, forward-moving",
                "tempo": "110 BPM",
                "licensing": "Royalty-free",
            },
            "editing_instructions": {
                "pacing": "Rhythmic, beat-synced",
                "cuts": ["On the beat", "Data-driven timing"],
                "color_grade": "Brand colors, clean whites",
            },
            "captions": {
                "style": "Clean kinetic typography",
                "position": "Dynamic, follows visuals",
                "animations": ["Scale in", "Slide by word", "Counter animate"],
            },
            "subtitles": {"languages": ["en"], "format": "srt"},
            "timeline": {
                "phases": [
                    {"name": "pre-production", "duration_hours": 2},
                    {"name": "production", "duration_hours": 4},
                    {"name": "post-production", "duration_hours": 3},
                ]
            },
        }

    def _cinematic_template(self, strategy: CreativeStrategy, request: ProductionGenerationRequest) -> Dict[str, Any]:
        """Cinematic template."""
        base = self._motion_graphics_template(strategy, request)
        base["animation_instructions"]["style"] = "Cinematic live-action style"
        base["visual_prompts"]["prompts"] = [
            {"frame": 0, "prompt": "Cinematic shot, dramatic lighting, shallow depth of field, 8k", "negative_prompt": "animation, cartoon, illustration"},
        ]
        base["video_assets"] = {
            "stock_clips": ["Establishing shots", "B-roll sequences", "Detail shots"],
            "b_roll": ["Work environment", "Product closeups", "Lifestyle shots"],
        }
        base["sound_design"]["ambient"] = ["Cinematic atmosphere", "Room tone", "Environmental sounds"]
        base["music_direction"]["genre"] = "Cinematic orchestral"
        base["editing_instructions"]["pacing"] = "Cinematic rhythm, breathing room"
        base["editing_instructions"]["color_grade"] = "Cinematic LUT, teal/orange or custom"
        return base

    def _documentary_template(self, strategy: CreativeStrategy, request: ProductionGenerationRequest) -> Dict[str, Any]:
        """Documentary template."""
        base = self._cinematic_template(strategy, request)
        base["animation_instructions"]["style"] = "Documentary style"
        base["hooks"]["opening"] = "Real person, real problem"
        base["voiceover"]["tone"] = "Authentic, investigative"
        base["music_direction"]["genre"] = "Documentary underscore"
        return base

    def _educational_template(self, strategy: CreativeStrategy, request: ProductionGenerationRequest) -> Dict[str, Any]:
        """Educational template."""
        return {
            "script": {
                "scenes": [
                    {"id": 1, "description": "Learning objective hook", "duration": 3},
                    {"id": 2, "description": "Concept introduction", "duration": 10},
                    {"id": 3, "description": "Deep dive explanation", "duration": 20},
                    {"id": 4, "description": "Practical example", "duration": 15},
                    {"id": 5, "description": "Summary & key takeaways", "duration": 8},
                    {"id": 6, "description": "Next steps CTA", "duration": 4},
                ],
                "dialogue": ["You'll learn...", "Here's the concept", "Let me explain", "For example", "Key takeaway", "Next step"],
                "timing": [0, 3, 13, 33, 48, 56],
            },
            "hooks": {
                "opening": "Clear learning promise + credibility signal",
                "retention": ["Common mistake alert", "Pro tip coming up", "This connects to..."],
                "cta": "Practice exercise in description",
            },
            "voiceover": {
                "script": "By the end of this video, you'll master this concept. Here's the core idea. Let me break it down step by step. Here's a practical example. The key takeaway is...",
                "timing_marks": [0, 3, 5, 15, 35, 50],
                "tone": "Clear, instructional, encouraging",
            },
            "storyboard": {
                "frames": [
                    {"time": 0, "visual": "Title card + instructor", "audio": "Intro music", "text_overlay": "Master [Topic] in 60s"},
                    {"time": 3, "visual": "Concept diagram", "audio": "Explanation music", "text_overlay": "The Core Concept"},
                    {"time": 13, "visual": "Animated explanation", "audio": "Steady pace", "text_overlay": "How it works"},
                    {"time": 33, "visual": "Real example", "audio": "Example context", "text_overlay": "Real Example"},
                    {"time": 48, "visual": "Summary bullets", "audio": "Wrap up", "text_overlay": "Key Takeaways"},
                    {"time": 56, "visual": "Practice prompt", "audio": "Outro", "text_overlay": "Your Turn: Practice"},
                ]
            },
            "character_designs": {"characters": []},
            "animation_instructions": {
                "style": "Educational motion graphics with instructor",
                "transitions": ["Clean cuts", "Diagram builds", "Zoom transitions"],
                "effects": ["Highlight annotations", "Progress indicators", "Comparison splits"],
            },
            "visual_prompts": {
                "prompts": [
                    {"frame": 0, "prompt": "Educational video thumbnail, clean design, instructor friendly, topic visual", "negative_prompt": "cluttered, confusing, unprofessional"},
                ]
            },
            "image_assets": {
                "needed": ["Diagrams", "Icons", "Screenshots", "Comparison visuals"],
                "style_references": ["Educational design", "Clear hierarchy", "Accessible colors"],
            },
            "video_assets": {"stock_clips": [], "b_roll": []},
            "sound_design": {
                "sfx": ["Notification", "Check mark", "Page turn", "Highlight"],
                "ambient": ["Quiet focus ambience"],
                "transitions": ["Smooth crossfade", "Diagram morph"],
            },
            "music_direction": {
                "genre": "Focus/lo-fi",
                "mood": "Calm, concentrating",
                "tempo": "85 BPM",
                "licensing": "Royalty-free",
            },
            "editing_instructions": {
                "pacing": "Comfortable, allows processing time",
                "cuts": ["On sentence boundaries", "Diagram reveal timing"],
                "color_grade": "Warm, easy on eyes",
            },
            "captions": {
                "style": "Clear, readable, high contrast",
                "position": "Bottom, safe area",
                "animations": ["Fade in by line", "Highlight key terms"],
            },
            "subtitles": {"languages": ["en", "es", "fr", "de", "ja", "ko"], "format": "srt"},
            "timeline": {
                "phases": [
                    {"name": "pre-production", "duration_hours": 2},
                    {"name": "production", "duration_hours": 3},
                    {"name": "post-production", "duration_hours": 2},
                ]
            },
        }

    async def generate_asset(
        self,
        request: ProductionAssetRequest,
    ) -> ProductionAssetResponse:
        """Generate a specific production asset on demand."""
        # Verify production exists
        result = await self.db.execute(
            select(Production).where(Production.id == request.production_id)
        )
        production = result.scalar_one_or_none()
        if not production:
            raise ValueError(f"Production {request.production_id} not found")

        # Generate specific asset
        asset_content = await self._generate_specific_asset(production, request.asset_type, request.parameters)

        return ProductionAssetResponse(
            asset_id=str(uuid.uuid4()),
            asset_type=request.asset_type,
            content=asset_content,
            generation_metadata={"generated_at": datetime.utcnow().isoformat()},
            status="completed",
        )

    async def _generate_specific_asset(
        self,
        production: Production,
        asset_type: str,
        parameters: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Generate a specific asset type."""
        # This would call AI image/video/audio generation APIs
        # For now return structured placeholder
        return {
            "asset_type": asset_type,
            "parameters": parameters or {},
            "status": "generated",
            "urls": [],  # Would contain generated asset URLs
        }

    async def get_production_queue(self, project_id: uuid.UUID) -> List[ProductionQueueItem]:
        """Get production queue for a project."""
        result = await self.db.execute(
            select(Production)
            .where(Production.project_id == project_id)
            .order_by(Production.created_at.desc())
        )
        productions = result.scalars().all()

        return [
            ProductionQueueItem(
                production_id=p.id,
                project_id=p.project_id,
                format=p.format.value,
                status=p.status,
                priority=1,  # Could be enhanced with priority logic
                created_at=p.created_at,
            )
            for p in productions
        ]

    async def update_production_status(
        self,
        production_id: uuid.UUID,
        status: str,
    ) -> Production:
        """Update production status."""
        result = await self.db.execute(
            select(Production).where(Production.id == production_id)
        )
        production = result.scalar_one_or_none()
        if not production:
            raise ValueError(f"Production {production_id} not found")

        production.status = status
        await self.db.commit()
        await self.db.refresh(production)
        return production

    async def export_production(
        self,
        production_id: uuid.UUID,
        export_format: str = "json",
        include_assets: bool = True,
    ) -> Dict[str, Any]:
        """Export production package for external tools."""
        result = await self.db.execute(
            select(Production).where(Production.id == production_id)
        )
        production = result.scalar_one_or_none()
        if not production:
            raise ValueError(f"Production {production_id} not found")

        export_data = {
            "production_id": str(production.id),
            "format": production.format.value,
            "script": production.script,
            "storyboard": production.storyboard,
            "voiceover": production.voiceover,
            "animation_instructions": production.animation_instructions,
            "visual_prompts": production.visual_prompts,
            "timeline": production.timeline,
        }
        if include_assets:
            export_data.update({
                "image_assets": production.image_assets,
                "video_assets": production.video_assets,
                "sound_design": production.sound_design,
                "music_direction": production.music_direction,
                "captions": production.captions,
                "subtitles": production.subtitles,
            })

        if export_format == "remotion":
            export_data = self._convert_to_remotion(export_data)
        elif export_format == "aftereffects":
            export_data = self._convert_to_aftereffects(export_data)
        elif export_format == "premiere":
            export_data = self._convert_to_premiere(export_data)

        return {
            "export_id": str(uuid.uuid4()),
            "format": export_format,
            "data": export_data,
            "size_bytes": len(json.dumps(export_data).encode()),
        }

    def _convert_to_remotion(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert to Remotion-compatible format."""
        return {
            "composition": {
                "width": 1920,
                "height": 1080,
                "fps": 30,
                "durationInFrames": data.get("timeline", {}).get("total_frames", 1800),
            },
            "scenes": data.get("script", {}).get("scenes", []),
            "audioTracks": data.get("voiceover", {}),
        }

    def _convert_to_aftereffects(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert to After Effects-compatible format (JSON for jsx import)."""
        return {
            "project": {
                "name": f"Production_{data['production_id'][:8]}",
                "compositions": [
                    {
                        "name": "Main",
                        "width": 1920,
                        "height": 1080,
                        "duration": data.get("timeline", {}).get("duration_seconds", 60),
                        "layers": self._storyboard_to_ae_layers(data.get("storyboard", {})),
                    }
                ],
            }
        }

    def _storyboard_to_ae_layers(self, storyboard: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Convert storyboard frames to AE layers."""
        frames = storyboard.get("frames", [])
        return [
            {
                "name": f"Frame_{f.get('time', 0)}",
                "startTime": f.get("time", 0),
                "duration": 1,  # Would calculate from next frame
                "sourceText": f.get("text_overlay", ""),
                "visualDescription": f.get("visual", ""),
            }
            for f in frames
        ]

    def _convert_to_premiere(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert to Premiere Pro-compatible format (XML/JSON)."""
        return {
            "sequence": {
                "name": f"Production_{data['production_id'][:8]}",
                "timebase": 30,
                "tracks": {
                    "video": self._storyboard_to_pr_tracks(data.get("storyboard", {})),
                    "audio": [
                        {"role": "voiceover", "source": data.get("voiceover", {}).get("script", "")},
                        {"role": "music", "mood": data.get("music_direction", {}).get("mood", "")},
                    ],
                },
            }
        }

    def _storyboard_to_pr_tracks(self, storyboard: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Convert storyboard to Premiere video tracks."""
        frames = storyboard.get("frames", [])
        return [
            {
                "clipName": f"Scene_{f.get('time', 0)}",
                "inPoint": f.get("time", 0),
                "outPoint": f.get("time", 0) + 1,
                "description": f.get("visual", ""),
            }
            for f in frames
        ]