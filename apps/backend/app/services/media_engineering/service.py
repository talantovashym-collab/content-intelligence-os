import asyncio
import uuid
import logging
import subprocess
import json
import tempfile
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.services.media_engineering.schemas import (
    MediaEngineeringRequest,
    MediaEngineeringResponse,
    AnalysisType,
    FrameExtractionConfig,
    SceneDetectionConfig,
    OCRConfig,
    AudioTranscriptionConfig,
    CreativeAnalysisConfig,
    FrameAnalysisResult,
    SceneAnalysisResult,
    AudioSegmentResult,
    CreativeTechniqueResult,
)
from app.models.reference import Reference
from app.models.investigation import Investigation, AnalysisType as DBAnalysisType
from app.core.config import settings

logger = logging.getLogger(__name__)


class MediaEngineeringService:
    """Service for reverse media engineering - detailed frame-by-frame analysis."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.storage_path = Path(settings.LOCAL_STORAGE_PATH) / "analysis"
        self.storage_path.mkdir(parents=True, exist_ok=True)

    async def analyze_media(self, request: MediaEngineeringRequest) -> MediaEngineeringResponse:
        """Start media analysis for a reference."""
        # Create analysis record
        analysis_id = uuid.uuid4()
        # For now, we'll use the Investigation model for storing results
        # TODO: Create dedicated analysis result model

        # Create initial response
        response = MediaEngineeringResponse(
            id=uuid.uuid4(),
            reference_id=request.reference_id,
            analysis_types=[at.value for at in request.analysis_types],
            status="pending",
            progress=0.0,
            results={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # Start async processing
        asyncio.create_task(self._process_analysis(response.id, request))

        return MediaEngineeringResponse(
            id=response.id,
            reference_id=request.reference_id,
            analysis_types=[at.value for at in request.analysis_types],
            status="pending",
            progress=0.0,
            results={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    async def _process_analysis(self, analysis_id: uuid.UUID, request: MediaEngineeringRequest) -> None:
        """Process the media analysis asynchronously."""
        try:
            # Get reference
            result = await self.db.execute(
                select(Reference).where(Reference.id == request.reference_id)
            )
            reference = result.scalar_one_or_none()
            if not reference or not reference.local_path:
                logger.error(f"Reference {request.reference_id} not found or not downloaded")
                return

            local_path = Path(reference.local_path)
            if not local_path.exists():
                logger.error(f"Local file not found: {reference.local_path}")
                return

            results = {}
            total_types = len(request.analysis_types)

            for i, analysis_type in enumerate(request.analysis_types):
                # Update progress
                progress = (i / len(request.analysis_types)) * 100

                try:
                    if analysis_type == AnalysisType.FRAME:
                        result = await self._extract_frames(request.reference_id, request.frame_extraction)
                        results[AnalysisType.FRAME.value] = result
                    elif analysis_type == AnalysisType.SCENE:
                        result = await self._detect_scenes(request.reference_id, request.scene_detection)
                        results[AnalysisType.SCENE.value] = result
                    elif analysis_type == AnalysisType.OCR:
                        result = await self._run_ocr(request.reference_id, request.ocr)
                        results[AnalysisType.OCR.value] = result
                    elif analysis_type == AnalysisType.SPEECH_TRANSCRIPTION:
                        result = await self._transcribe_audio(request.reference_id, request.audio_transcription)
                        results[AnalysisType.SPEECH_TRANSCRIPTION.value] = result
                    elif analysis_type in [AnalysisType.HOOKS, AnalysisType.STORYTELLING,
                                           AnalysisType.EMOTIONAL_TRIGGERS, AnalysisType.NARRATIVE_STRUCTURE,
                                           AnalysisType.ANIMATION, AnalysisType.EDITING,
                                           AnalysisType.TIMING, AnalysisType.PACING,
                                           AnalysisType.CTAS, AnalysisType.PAYOFFS]:
                        result = await self._analyze_creative_techniques(
                            request.reference_id, request.creative_analysis
                        )
                        results[analysis_type.value] = result
                    else:
                        # Handle other analysis types
                        result = await self._generic_analysis(request.reference_id, analysis_type)
                        results[analysis_type.value] = result

                except Exception as e:
                    logger.error(f"Error in {analysis_type}: {e}")
                    results[analysis_type.value] = {"error": str(e)}

            # TODO: Store results in database
            logger.info(f"Completed analysis for reference {request.reference_id}")

        except Exception as e:
            logger.error(f"Error processing analysis: {e}")

    async def _extract_frames(self, reference_id: uuid.UUID, config: Optional[FrameExtractionConfig]) -> Dict[str, Any]:
        """Extract frames from video using ffmpeg."""
        config = config or FrameExtractionConfig()

        # Get reference path
        result = await self.db.execute(
            select(Reference).where(Reference.id == uuid.UUID(config))
        )
        reference = result.scalar_one_or_none()
        if not reference or not reference.local_path:
            return {"error": "Reference not found"}

        video_path = Path(reference.local_path)
        output_dir = Path(settings.LOCAL_STORAGE_PATH) / "frames" / str(reference_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Build ffmpeg command
        interval = config.interval_seconds
        output_pattern = str(output_dir / "frame_%06d.jpg")

        cmd = [
            "ffmpeg", "-i", str(reference.local_path),
            "-vf", f"fps=1/{config.interval_seconds},scale={config.target_width}:-1",
            "-q:v", str(100 - config.quality),
            output_pattern
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                return {"error": stderr.decode()}

            # List generated frames
            frames = sorted(output_dir.glob("*.jpg"))
            return {
                "frames_extracted": len(frames),
                "frame_dir": str(output_dir),
                "interval_seconds": config.interval_seconds,
            }
        except Exception as e:
            return {"error": str(e)}

    async def _detect_scenes(self, reference_id: uuid.UUID, config: Optional[SceneDetectionConfig]) -> Dict[str, Any]:
        """Detect scene changes using scenedetect."""
        config = config or SceneDetectionConfig()

        # Use scenedetect CLI
        result = await self.db.execute(
            select(Reference).where(Reference.id == reference_id)
        )
        reference = result.scalar_one_or_none()
        if not reference or not reference.local_path:
            return {"error": "Reference not found"}

        output_dir = Path(settings.LOCAL_STORAGE_PATH) / "scenes" / str(reference_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        cmd = [
            "scenedetect", "-i", str(reference.local_path),
            "detect-content", "-t", str(config.threshold),
            "save-images", "-o", str(output_dir),
            "list-scenes", "-o", str(output_dir / "scenes.csv")
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                return {"error": stderr.decode()}

            # Parse scenes CSV
            scenes = []
            csv_path = output_dir / "scenes.csv"
            if csv_path.exists():
                import csv
                with open(csv_path) as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        scenes.append({
                            "scene_number": int(row.get("Scene Number", 0)),
                            "start_time": float(row.get("Start Time (seconds)", 0)),
                            "end_time": float(row.get("End Time (seconds)", 0)),
                            "duration": float(row.get("Length (seconds)", 0)),
                        })

            return {
                "scenes_detected": len(scenes),
                "scenes": scenes,
                "scene_dir": str(output_dir),
            }
        except Exception as e:
            return {"error": str(e)}

    async def _run_ocr(self, reference_id: uuid.UUID, config: Optional[OCRConfig]) -> Dict[str, Any]:
        """Run OCR on extracted frames using tesseract."""
        config = config or OCRConfig()

        # This would run tesseract on extracted frames
        # For now, return placeholder
        return {
            "status": "not_implemented",
            "message": "OCR processing requires frame extraction first",
        }

    async def _transcribe_audio(self, reference_id: uuid.UUID, config: Optional[AudioTranscriptionConfig]) -> Dict[str, Any]:
        """Transcribe audio using Whisper."""
        config = config or AudioTranscriptionConfig()

        result = await self.db.execute(
            select(Reference).where(Reference.id == reference_id)
        )
        reference = result.scalar_one_or_none()
        if not reference or not reference.local_path:
            return {"error": "Reference not found"}

        video_path = Path(reference.local_path)
        audio_path = Path(tempfile.mktemp(suffix=".wav"))

        # Extract audio
        extract_cmd = [
            "ffmpeg", "-i", str(reference.local_path),
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            str(audio_path)
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *extract_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()

            # Run Whisper
            model = config.model.replace("whisper-", "")
            whisper_cmd = [
                "whisper", str(audio_path),
                "--model", model,
                "--language", config.language or "auto",
                "--output_format", "json",
                "--output_dir", str(Path(settings.LOCAL_STORAGE_PATH) / "transcripts" / str(uuid.uuid4())),
            ]

            if config.detect_speakers:
                whisper_cmd.append("--diarize")

            proc = await asyncio.create_subprocess_exec(
                *whisper_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()

            # Clean up audio file
            audio_path.unlink(missing_ok=True)

            if proc.returncode != 0:
                return {"error": stderr.decode()}

            # Parse JSON output
            # Whisper outputs to a JSON file
            return {"status": "completed", "transcript_file": "output.json"}
        except Exception as e:
            return {"error": str(e)}

    async def _analyze_creative_techniques(
        self, reference_id: uuid.UUID, config: Optional[CreativeAnalysisConfig]
    ) -> Dict[str, Any]:
        """Analyze creative techniques using LLM on transcript + frame descriptions."""
        config = config or CreativeAnalysisConfig()

        # This would use an LLM to analyze:
        # - Transcript (if available)
        # - Frame descriptions (from vision model)
        # - Scene structure
        # - Audio cues

        return {
            "status": "not_implemented",
            "message": "Creative analysis requires LLM integration",
            "config": config.model_dump() if config else None,
        }

    async def _generic_analysis(self, reference_id: uuid.UUID, analysis_type: AnalysisType) -> Dict[str, Any]:
        """Generic analysis for other types."""
        return {
            "status": "not_implemented",
            "analysis_type": analysis_type.value,
        }

    async def get_analysis_status(self, analysis_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Get analysis status."""
        # TODO: Implement status tracking
        return None

    async def list_analyses(
        self,
        reference_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """List analyses."""
        # TODO: Implement
        return {
            "analyses": [],
            "total": 0,
            "page": page,
            "page_size": page_size,
        }