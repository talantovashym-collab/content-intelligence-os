"""Local draft render: a production's storyboard as a watchable MP4, made with ffmpeg only.

No AI or paid API is involved. Each storyboard frame becomes a timed scene card (on-screen
text, the visual direction, and the voiceover line as a caption), after a short title card.
The result is a silent animatic for checking pacing and story before the real edit; the
finished cut can replace it later (upload in the Production module).
"""

from __future__ import annotations

import asyncio
import re
import shutil
import tempfile
import textwrap
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.services import media

FPS = 25
SIZES = {"16:9": (1280, 720), "9:16": (720, 1280)}
MIN_SCENE, MAX_SCENE, MAX_TOTAL, MAX_SCENES = 2.0, 15.0, 180.0, 30
TITLE_SECONDS = 2.5
PALETTE = ["0x1e293b", "0x312e81", "0x134e4a", "0x7c2d12", "0x4a044e", "0x1e3a8a", "0x14532d", "0x581c87"]
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")

# Renders are CPU-heavy; keep a couple at most running at once
_slots = asyncio.Semaphore(2)


class RenderError(media.MediaError):
    """The production cannot be rendered (nothing to show, or ffmpeg failed)."""


def _text(value: Any, limit: int) -> str:
    """LLM output is untrusted: any type in, one clean line of at most `limit` chars out."""
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    value = re.sub(r"\s+", " ", value).strip()
    return value if len(value) <= limit else value[: limit - 1].rstrip() + "…"


def _seconds(value: Any) -> Optional[float]:
    try:
        f = float(value)
    except (TypeError, ValueError):
        m = re.match(r"^\s*(\d+):(\d{1,2})(?:\.\d+)?\s*$", str(value or ""))  # "0:03"
        return int(m.group(1)) * 60 + int(m.group(2)) if m else None
    return f if f >= 0 else None


def _sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[.!?…])\s+", _text(text, 4000))
    return [p for p in (s.strip() for s in parts) if p]


def plan_scenes(production, topic: str, target_seconds: Optional[int]) -> List[Dict[str, Any]]:
    """Scene list [{headline, visual, caption, duration}] from the storyboard, else the script."""
    frames = (production.storyboard or {}).get("frames")
    scenes: List[Dict[str, Any]] = []
    if isinstance(frames, list) and frames:
        frames = [f for f in frames if isinstance(f, dict)][:MAX_SCENES]
        times = [_seconds(f.get("time")) for f in frames]
        for i, f in enumerate(frames):
            start, nxt = times[i], times[i + 1] if i + 1 < len(times) else None
            if start is not None and nxt is not None and nxt > start:
                dur = nxt - start
            elif start is not None and nxt is None and target_seconds and target_seconds > start:
                dur = target_seconds - start
            else:
                dur = 4.0
            scenes.append({"headline": _text(f.get("text_overlay") or f.get("visual"), 120),
                           "visual": _text(f.get("visual") if f.get("text_overlay") else "", 240),
                           "duration": dur})
    else:
        script_scenes = (production.script or {}).get("scenes")
        if isinstance(script_scenes, list):
            for s in script_scenes[:MAX_SCENES]:
                if isinstance(s, dict):
                    scenes.append({"headline": _text(s.get("description") or s.get("title") or s.get("text"), 120),
                                   "visual": _text(s.get("visual"), 240),
                                   "duration": _seconds(s.get("duration")) or 4.0})
                elif isinstance(s, str):
                    scenes.append({"headline": _text(s, 120), "visual": "", "duration": 4.0})
    scenes = [s for s in scenes if s["headline"] or s["visual"]]
    if not scenes:
        raise RenderError("This production has no storyboard or script scenes to render")

    for s in scenes:
        s["duration"] = max(MIN_SCENE, min(MAX_SCENE, float(s["duration"])))
    total = sum(s["duration"] for s in scenes)
    if total > MAX_TOTAL:
        scale = MAX_TOTAL / total
        for s in scenes:
            s["duration"] = max(MIN_SCENE, s["duration"] * scale)

    # Narration as captions: spread the voiceover's sentences over the scenes in order
    lines = _sentences((production.voiceover or {}).get("script") or "")
    for i, s in enumerate(scenes):
        chunk = lines[round(i * len(lines) / len(scenes)): round((i + 1) * len(lines) / len(scenes))]
        s["caption"] = _text(" ".join(chunk), 200)

    hook = _text((production.hooks or {}).get("opening"), 160)
    return [{"headline": _text(topic, 120), "visual": hook, "caption": "", "duration": TITLE_SECONDS,
             "title": True}] + scenes


def _font(bold: bool) -> str:
    path = FONT_DIR / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")
    return f"fontfile={path}" if path.exists() else "font=Sans"


def _wrap(text: str, size: int, width: int) -> str:
    chars = max(12, int(width * 0.86 / (size * 0.56)))
    return "\n".join(textwrap.wrap(text, chars)[:6])


def _drawtext(textfile: Path, size: int, color: str, y: str, bold: bool, fade_at: float, box: bool = False) -> str:
    # textfile + expansion=none: scene text never needs ffmpeg escaping and '%' is literal
    opts = [_font(bold), f"textfile='{textfile.as_posix()}'", "expansion=none", f"fontsize={size}",
            f"fontcolor={color}", "x=(w-text_w)/2", f"y={y}",
            f"alpha='if(lt(t,{fade_at:.2f}),0,min(1,(t-{fade_at:.2f})/0.4))'"]
    if box:
        opts += ["box=1", "boxcolor=black@0.55", "boxborderw=14"]
    return "drawtext=" + ":".join(opts)


def _scene_filter(scene: Dict[str, Any], index: int, count: int, size: Tuple[int, int], work: Path,
                  label: str) -> str:
    w, h = size
    unit = min(w, h)
    parts: List[str] = []

    def add(name: str, text: str, font: int, color: str, top, bold: bool, at: float, box: bool = False):
        """One drawtext per wrapped line, so every line is centred; top(lines, line_height) -> y of the first."""
        if not text:
            return
        lines = _wrap(text, font, w).split("\n")
        lh = int(font * 1.3)
        for j, line in enumerate(lines):
            f = work / f"s{index:02d}_{name}{j}.txt"
            f.write_text(line, encoding="utf-8")
            parts.append(_drawtext(f, font, color, f"{top(len(lines), lh)}+{j * lh}", bold, at, box))

    head = int(unit * (0.085 if scene.get("title") else 0.07))
    add("head", scene["headline"], head, "white", lambda n, lh: f"(h-{n * lh})/2-h*0.08", True, 0.1)
    add("visual", scene["visual"], int(unit * 0.036), "white@0.75", lambda n, lh: "h*0.62", False, 0.5)
    add("caption", scene["caption"], int(unit * 0.034), "white", lambda n, lh: f"h-{n * lh}-h*0.07", False, 0.3, box=True)
    add("label", label, int(unit * 0.026), "white@0.6", lambda n, lh: "h*0.05", True, 0.0)
    d = scene["duration"]
    parts.append(f"fade=t=in:st=0:d=0.3,fade=t=out:st={max(0.0, d - 0.3):.2f}:d=0.3")
    return ",".join(parts)


async def _ffmpeg(*args: str, timeout: float) -> None:
    proc = await asyncio.create_subprocess_exec("ffmpeg", "-nostdin", "-y", "-v", "error", *args,
                                                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        _, err = await asyncio.wait_for(proc.communicate(), timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise RenderError(f"Rendering took longer than {int(timeout)}s")
    if proc.returncode != 0:
        raise RenderError("ffmpeg could not render the video: " + err.decode(errors="replace")[-300:])


async def render_storyboard(scenes: List[Dict[str, Any]], dest: Path, aspect: str, format_label: str) -> None:
    size = SIZES.get(aspect, SIZES["16:9"])
    work = Path(tempfile.mkdtemp(prefix="render-"))
    try:
        async with _slots:
            pieces = []
            clock = 0.0
            for i, scene in enumerate(scenes):
                d = round(scene["duration"], 2)
                label = (f"DRAFT RENDER · {format_label}" if scene.get("title")
                         else f"SCENE {i}/{len(scenes) - 1} · {int(clock // 60)}:{int(clock % 60):02d}")
                vf = _scene_filter(scene, i, len(scenes), size, work, label)
                piece = work / f"p{i:02d}.mp4"
                await _ffmpeg("-f", "lavfi", "-i", f"color=c={PALETTE[i % len(PALETTE)]}:s={size[0]}x{size[1]}:r={FPS}:d={d}",
                              "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo:d={d}",
                              "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
                              "-threads", "4", "-c:a", "aac", "-b:a", "64k",
                              # explicit length, not -shortest: -shortest can deadlock with finite lavfi inputs
                              "-t", f"{d}", str(piece), timeout=300)
                pieces.append(piece)
                clock += d
            listing = work / "list.txt"
            listing.write_text("".join(f"file '{p.as_posix()}'\n" for p in pieces), encoding="utf-8")
            dest.parent.mkdir(parents=True, exist_ok=True)
            await _ffmpeg("-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", "-movflags", "+faststart",
                          str(dest), timeout=300)
    except BaseException:
        dest.unlink(missing_ok=True)
        raise
    finally:
        shutil.rmtree(work, ignore_errors=True)


async def render_production(production, topic: str, target_seconds: Optional[int], aspect: str) -> dict:
    """Render and store the draft; returns the same file facts as an upload (see uploads._store)."""
    scenes = plan_scenes(production, topic, target_seconds)
    item_id = uuid.uuid4()
    dest = media.MEDIA_ROOT / "productions" / str(production.project_id) / f"{item_id}.mp4"
    fmt = production.format.value.replace("_", " ").title()
    await render_storyboard(scenes, dest, aspect, fmt.upper())
    try:
        info = await media.probe(dest)
        thumb = dest.with_suffix(".jpg")
        poster = media.rel_path(thumb) if await media.make_thumbnail(dest, thumb, info["duration"]) else None
    except BaseException:
        dest.unlink(missing_ok=True)
        raise
    slug = re.sub(r"[^\w-]+", "-", topic.lower()).strip("-")[:60] or "production"
    return {
        "path": media.rel_path(dest), "poster_path": poster, "filename": f"{slug}-draft.mp4",
        "size": dest.stat().st_size, "content_type": "video/mp4", "duration": info["duration"],
        "has_video": info["has_video"], "has_audio": info["has_audio"],
        "width": info["width"], "height": info["height"], "aspect": aspect, "scenes": len(scenes) - 1,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
