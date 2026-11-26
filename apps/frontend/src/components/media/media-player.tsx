'use client';

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { ExternalLink, Music2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mediaUrl } from '@/lib/api';

/** Anything the app can play: an uploaded file (signed URL) or a public post (embed). */
export interface PlayableSource {
  title: string;
  playback_url?: string | null;
  poster_url?: string | null;
  thumbnail_url?: string | null;
  source_url?: string | null;
  media_type?: string | null;
  video_id?: string | null;
}

export interface PlayerHandle {
  /** Jump to a moment (seconds) and start playing. */
  seek: (seconds: number) => void;
  /** Whether seek() can land on an exact second for this source. */
  canSeek: boolean;
}

type Embed = { kind: 'youtube' | 'tiktok' | 'instagram'; id: string; vertical: boolean; extra?: string };

export function embedFor(url: string | null | undefined, videoId?: string | null): Embed | null {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
    const shorts = u.pathname.match(/^\/shorts\/([\w-]{6,})/);
    const id = videoId || shorts?.[1] || u.searchParams.get('v') || (host === 'youtu.be' ? u.pathname.slice(1) : null);
    return id ? { kind: 'youtube', id, vertical: Boolean(shorts) } : null;
  }
  if (host.endsWith('tiktok.com')) {
    const m = u.pathname.match(/\/video\/(\d+)/);
    return m ? { kind: 'tiktok', id: m[1], vertical: true } : null;
  }
  if (host === 'instagram.com') {
    const m = u.pathname.match(/^\/(reel|reels|p|tv)\/([\w-]+)/);
    return m ? { kind: 'instagram', id: m[2], vertical: true, extra: m[1] === 'p' ? 'p' : 'reel' } : null;
  }
  return null;
}

function embedSrc(e: Embed, start: number | null): string {
  if (e.kind === 'youtube') {
    const q = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
    if (start !== null) { q.set('start', String(Math.floor(start))); q.set('autoplay', '1'); }
    return `https://www.youtube-nocookie.com/embed/${e.id}?${q}`;
  }
  if (e.kind === 'tiktok') return `https://www.tiktok.com/embed/v2/${e.id}`;
  return `https://www.instagram.com/${e.extra}/${e.id}/embed`;
}

/**
 * Plays an uploaded file with the browser's player, or embeds YouTube / TikTok / Instagram.
 * Starts as a poster with a play button, so a page full of references does not load every player.
 */
export const MediaPlayer = forwardRef<PlayerHandle, { source: PlayableSource; className?: string; autoLoad?: boolean }>(
  function MediaPlayer({ source, className, autoLoad = false }, ref) {
    const videoRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);
    const [active, setActive] = useState(autoLoad);
    const [start, setStart] = useState<number | null>(null);
    const file = mediaUrl(source.playback_url);
    const poster = mediaUrl(source.poster_url) ?? source.thumbnail_url ?? undefined;
    const embed = file ? null : embedFor(source.source_url, source.video_id);
    const isAudio = source.media_type === 'AUDIO';

    useImperativeHandle(ref, () => ({
      canSeek: Boolean(file) || embed?.kind === 'youtube',
      seek: (seconds: number) => {
        setActive(true);
        if (file) {
          const el = videoRef.current;
          if (el) { el.currentTime = seconds; void el.play().catch(() => undefined); }
          else setStart(seconds); // element mounts on this render; applied in onLoadedMetadata
        } else {
          setStart(seconds);
        }
      },
    }), [file, embed]);

    if (!file && !embed) {
      return (
        <div className={cn('relative grid aspect-video place-items-center overflow-hidden rounded-lg bg-muted', className)}>
          {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
          {source.source_url ? (
            <a href={source.source_url} target="_blank" rel="noreferrer noopener"
              className="relative inline-flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow">
              <ExternalLink className="h-4 w-4" /> This platform cannot be embedded; open it there
            </a>
          ) : <p className="relative text-sm text-muted-foreground">No playable media</p>}
        </div>
      );
    }

    const vertical = Boolean(embed?.vertical);
    const frame = cn('relative overflow-hidden rounded-lg bg-black',
      vertical ? 'mx-auto aspect-[9/16] max-h-[70vh]' : isAudio ? '' : 'aspect-video', className);

    if (!active) {
      return (
        <button type="button" onClick={() => setActive(true)} aria-label={`Play ${source.title}`}
          className={cn(frame, 'group block w-full', isAudio && 'aspect-[4/1]')}>
          {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          {isAudio && !poster && <Music2 className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white/40" />}
          <span className="absolute inset-0 grid place-items-center bg-black/20 transition-colors group-hover:bg-black/35">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-black shadow-lg transition-transform group-hover:scale-105">
              <Play className="ml-0.5 h-6 w-6 fill-current" />
            </span>
          </span>
        </button>
      );
    }

    if (file) {
      const onLoaded = () => {
        if (start !== null && videoRef.current) { videoRef.current.currentTime = start; setStart(null); }
      };
      return isAudio ? (
        <div className={cn('rounded-lg border bg-muted/40 p-4', className)}>
          <audio ref={videoRef} src={file} controls autoPlay preload="metadata" onLoadedMetadata={onLoaded} className="w-full" />
        </div>
      ) : (
        <div className={frame}>
          <video ref={videoRef} src={file} poster={poster} controls autoPlay playsInline preload="metadata"
            onLoadedMetadata={onLoaded} className="h-full w-full" />
        </div>
      );
    }

    return (
      <div className={frame}>
        <iframe key={start ?? 'start'} src={embedSrc(embed!, start)} title={source.title}
          className="absolute inset-0 h-full w-full" loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    );
  },
);
