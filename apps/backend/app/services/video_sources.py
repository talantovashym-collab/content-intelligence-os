"""Real video data from YouTube, TikTok and other sites via yt-dlp (no platform API keys).

Used by opportunity discovery (what is already out there for a niche), reference
research (find videos to study), reference capture (metadata for a pasted URL)
and investigations (captions as a transcript).

yt-dlp is synchronous and does network I/O, so every public function runs it in
a worker thread. Failures raise VideoSourceError with a readable message.
"""

from __future__ import annotations

import asyncio
import html
import json
import logging
import re
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# YouTube search result filters ("sp" parameter): videos only, sorted by
_SORT_FILTERS = {
    "relevance": "EgIQAQ%253D%253D",
    "views": "CAMSAhAB",
    "date": "CAISAhAB",
}

_PLATFORM_BY_HOST = {
    "youtube.com": "YOUTUBE",
    "youtu.be": "YOUTUBE",
    "tiktok.com": "TIKTOK",
    "instagram.com": "INSTAGRAM",
    "facebook.com": "FACEBOOK",
    "fb.watch": "FACEBOOK",
    "twitter.com": "TWITTER",
    "x.com": "TWITTER",
    "linkedin.com": "LINKEDIN",
}


class VideoSourceError(RuntimeError):
    pass


# Upper bounds for one yt-dlp operation; a slow site should fail the request, not hang it
SEARCH_TIMEOUT = 45
DETAILS_TIMEOUT = 90
CAPTIONS_TIMEOUT = 30


async def _run(fn, timeout: float, *args):
    try:
        return await asyncio.wait_for(asyncio.to_thread(fn, *args), timeout)
    except asyncio.TimeoutError as e:
        raise VideoSourceError(f"Timed out after {timeout:.0f}s talking to the video site; try again") from e


@dataclass
class VideoInfo:
    url: str
    title: str
    platform: Optional[str] = None
    video_id: Optional[str] = None
    creator: Optional[str] = None
    creator_id: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    published_at: Optional[datetime] = None
    views: Optional[int] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    followers: Optional[int] = None
    tags: List[str] = field(default_factory=list)
    hashtags: List[str] = field(default_factory=list)
    raw: Dict[str, Any] = field(default_factory=dict, repr=False)

    @property
    def engagement_rate(self) -> Optional[float]:
        if not self.views:
            return None
        return round(((self.likes or 0) + (self.comments or 0)) / self.views, 4)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "url": self.url,
            "title": self.title,
            "platform": self.platform,
            "video_id": self.video_id,
            "creator": self.creator,
            "duration": self.duration,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "views": self.views,
            "likes": self.likes,
            "comments": self.comments,
            "engagement_rate": self.engagement_rate,
            "thumbnail_url": self.thumbnail_url,
        }


def platform_for_url(url: str) -> Optional[str]:
    host = (urllib.parse.urlparse(url).hostname or "").lower()
    for domain, platform in _PLATFORM_BY_HOST.items():
        if host == domain or host.endswith("." + domain):
            return platform
    return None


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value or not re.fullmatch(r"\d{8}", value):
        return None
    return datetime.strptime(value, "%Y%m%d").replace(tzinfo=timezone.utc)


def _to_info(entry: Dict[str, Any]) -> VideoInfo:
    url = entry.get("webpage_url") or entry.get("url") or ""
    if url and not url.startswith("http") and entry.get("id"):
        url = f"https://www.youtube.com/watch?v={entry['id']}"
    thumbnail = entry.get("thumbnail")
    if not thumbnail and entry.get("thumbnails"):
        thumbnail = entry["thumbnails"][-1].get("url")
    description = entry.get("description") or ""
    return VideoInfo(
        url=url,
        title=entry.get("title") or "Untitled",
        platform=platform_for_url(url),
        video_id=entry.get("id"),
        creator=entry.get("channel") or entry.get("uploader") or entry.get("creator"),
        creator_id=entry.get("channel_id") or entry.get("uploader_id"),
        description=description or None,
        thumbnail_url=thumbnail,
        duration=entry.get("duration"),
        published_at=_parse_date(entry.get("upload_date")),
        views=entry.get("view_count"),
        likes=entry.get("like_count"),
        comments=entry.get("comment_count"),
        followers=entry.get("channel_follower_count"),
        tags=list(entry.get("tags") or [])[:30],
        hashtags=sorted(set(re.findall(r"#(\w+)", description)))[:30],
        raw=entry,
    )


def _ydl_opts(language: str = "en", **extra: Any) -> Dict[str, Any]:
    return {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "socket_timeout": 20,
        # Results otherwise follow the server's IP region
        "http_headers": {"Accept-Language": f"{language},en;q=0.8"},
        # Metadata only: skip downloading/running YouTube's player JS (only needed to fetch media)
        "extractor_args": {"youtube": {"player_skip": ["js"]}},
        **extra,
    }


def _search_sync(query: str, limit: int, sort: str, language: str) -> List[VideoInfo]:
    import yt_dlp

    url = "https://www.youtube.com/results?" + urllib.parse.urlencode({"search_query": query, "hl": language})
    url += "&sp=" + _SORT_FILTERS.get(sort, _SORT_FILTERS["relevance"])
    opts = _ydl_opts(language, extract_flat="in_playlist", playlistend=limit, noplaylist=False)
    with yt_dlp.YoutubeDL(opts) as ydl:
        result = ydl.extract_info(url, download=False) or {}
    entries = [e for e in (result.get("entries") or []) if e and e.get("id")]
    return [_to_info(e) for e in entries[:limit]]


async def search_youtube(query: str, limit: int = 10, sort: str = "relevance", language: str = "en") -> List[VideoInfo]:
    """YouTube search. sort: relevance | views | date ("views" ranks popular videos
    loosely matching the query; prefer relevance and sort locally). Flat results:
    no likes or description."""
    try:
        return await _run(_search_sync, SEARCH_TIMEOUT, query, limit, sort, language)
    except VideoSourceError:
        raise
    except Exception as e:
        raise VideoSourceError(f"YouTube search failed: {e}") from e


def _details_sync(url: str) -> VideoInfo:
    import yt_dlp

    with yt_dlp.YoutubeDL(_ydl_opts()) as ydl:
        entry = ydl.extract_info(url, download=False) or {}
    if entry.get("_type") == "playlist":
        raise VideoSourceError("That link is a playlist or channel; paste a single video URL")
    return _to_info(entry)


async def video_details(url: str) -> VideoInfo:
    """Full metadata for one video URL (title, creator, stats, description, tags, caption tracks)."""
    try:
        return await _run(_details_sync, DETAILS_TIMEOUT, url)
    except VideoSourceError:
        raise
    except Exception as e:
        message = str(e).replace("ERROR: ", "")
        raise VideoSourceError(f"Could not read that video: {message}") from e


def _pick_caption_track(info: VideoInfo, languages: List[str]) -> Optional[Dict[str, Any]]:
    for source in ("subtitles", "automatic_captions"):
        tracks = info.raw.get(source) or {}
        for lang in languages:
            for key, formats in tracks.items():
                if key == lang or key.startswith(lang + "-"):
                    by_ext = {f.get("ext"): f for f in formats or []}
                    track = by_ext.get("json3") or by_ext.get("vtt")
                    if track and track.get("url"):
                        return {**track, "language": key, "automatic": source == "automatic_captions"}
    return None


def _download_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8", errors="replace")


def _captions_to_segments(body: str, ext: str) -> List[Dict[str, Any]]:
    segments: List[Dict[str, Any]] = []
    if ext == "json3":
        for event in json.loads(body).get("events", []):
            text = "".join(seg.get("utf8", "") for seg in event.get("segs") or []).strip()
            if text:
                segments.append({"start": round(event.get("tStartMs", 0) / 1000, 2), "text": text})
    else:  # WebVTT
        start = None
        for line in body.splitlines():
            if "-->" in line:
                h, m, s = line.split("-->")[0].strip().replace(",", ".").split(":")[-3:]
                start = round(int(h) * 3600 + int(m) * 60 + float(s), 2)
            elif line.strip() and start is not None and not line.startswith(("WEBVTT", "Kind:", "Language:")):
                segments.append({"start": start, "text": re.sub(r"<[^>]+>", "", line).strip()})
    # Auto captions repeat lines as they scroll; drop consecutive duplicates
    deduped: List[Dict[str, Any]] = []
    for seg in segments:
        seg["text"] = html.unescape(seg["text"])
        if not deduped or deduped[-1]["text"] != seg["text"]:
            deduped.append(seg)
    return deduped


async def fetch_transcript(info: VideoInfo, languages: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
    """Captions as {language, automatic, segments: [{start, text}], text}; None when the video has none."""
    track = _pick_caption_track(info, languages or ["en"])
    if track is None:
        return None
    try:
        body = await _run(_download_text, CAPTIONS_TIMEOUT, track["url"])
        segments = _captions_to_segments(body, track.get("ext", "vtt"))
    except Exception as e:
        logger.warning("Caption download failed for %s: %s", info.url, e)
        return None
    if not segments:
        return None
    return {
        "language": track["language"],
        "automatic": track["automatic"],
        "segments": segments,
        "text": " ".join(s["text"] for s in segments),
    }
