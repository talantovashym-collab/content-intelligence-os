'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clapperboard, FileVideo, Film, Loader2, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaPlayer } from '@/components/media/media-player';
import { cn } from '@/lib/utils';
import { PLATFORM_LABELS, productionsApi, type ProductionVideo, type VideoAspect } from '@/lib/api';

const VIDEO_ACCEPT = 'video/*,.mp4,.mov,.webm,.mkv,.m4v,.avi';

export const videosKey = (projectId: string) => ['production-videos', projectId];

function sourceLabel(v: ProductionVideo) {
  if (v.source === 'render') return 'Draft render';
  if (v.source === 'publication') return `Publishing${v.platform ? ` · ${PLATFORM_LABELS[v.platform]}` : ''}`;
  return 'Finished cut';
}

/** Frame classes so a vertical video is shown upright instead of cropped into 16:9. */
function frameFor(v: ProductionVideo, wide: string) {
  // Full width, capped so the 9:16 box is at most 70vh tall
  return v.width && v.height && v.height > v.width ? 'mx-auto aspect-[9/16] max-w-[calc(70vh*9/16)]' : wide;
}

function duration(seconds: number | null) {
  if (!seconds) return null;
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Badge text for a video: where it came from and how long it is. */
export function VideoMeta({ video, className }: { video: ProductionVideo; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs text-muted-foreground', className)}>
      <span className={cn('rounded px-2 py-0.5 font-medium',
        video.source === 'render' ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-green-800')}>
        {sourceLabel(video)}
      </span>
      {duration(video.duration) && <span>{duration(video.duration)}</span>}
      {video.width && video.height && <span>{video.width}×{video.height}</span>}
      {video.filename && <span className="truncate">{video.filename}</span>}
    </div>
  );
}

/** Every watchable video of the project, newest first, at the top of the Production module. */
export function VideoGallery({ videos, loading, error }: { videos?: ProductionVideo[]; loading: boolean; error: Error | null }) {
  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!videos?.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Film className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 font-medium">No videos yet</p>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
          Open a production below and click <span className="font-medium text-foreground">Render draft video</span> to
          turn its storyboard into a video on this computer (no API keys needed), or upload the finished cut you made in
          your editor. Finished cuts attached in <Link href="/publishing" className="text-primary hover:underline">Publishing</Link> show
          here too.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {videos.map((v) => (
        <div key={`${v.kind}-${v.id}`} className="space-y-2">
          <MediaPlayer source={{ title: v.title, playback_url: v.playback_url, poster_url: v.poster_url }}
            className={frameFor(v, '')} />
          <div>
            <p className="truncate font-medium">{v.title}</p>
            <VideoMeta video={v} className="mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A production's own video: watch it, or render a draft / upload the finished cut. */
export function ProductionVideoPanel({ projectId, productionId, title, video }: {
  projectId: string;
  productionId: string;
  title: string;
  video?: ProductionVideo;
}) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [aspect, setAspect] = useState<VideoAspect>('16:9');
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: videosKey(projectId) });

  const render = useMutation({ mutationFn: () => productionsApi.render(projectId, productionId, aspect), onSuccess: refresh });
  const upload = useMutation({
    mutationFn: (file: File) => productionsApi.uploadVideo(projectId, productionId, file, setProgress),
    onSettled: () => setProgress(null),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: () => productionsApi.removeVideo(projectId, productionId), onSuccess: refresh });
  const busy = render.isPending || upload.isPending || remove.isPending;
  const error = render.error ?? upload.error ?? remove.error;

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (video?.source === 'upload' && !window.confirm('Replace the finished cut already attached?')) return;
    upload.mutate(file);
  };
  const startRender = () => {
    if (video?.source === 'upload' && !window.confirm('Replace your uploaded finished cut with a draft render?')) return;
    render.mutate();
  };

  const renderControls = (
    <div className="flex flex-wrap items-center gap-2">
      <select value={aspect} onChange={(e) => setAspect(e.target.value as VideoAspect)} disabled={busy}
        aria-label="Video shape" className="h-9 rounded-md border border-input bg-background px-2 text-sm">
        <option value="16:9">16:9 landscape</option>
        <option value="9:16">9:16 vertical</option>
      </select>
      <Button type="button" size="sm" onClick={startRender} disabled={busy}>
        {render.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : video ? <RefreshCw className="mr-2 h-4 w-4" /> : <Clapperboard className="mr-2 h-4 w-4" />}
        {render.isPending ? 'Rendering…' : video?.source === 'render' ? 'Render again' : 'Render draft video'}
      </Button>
    </div>
  );

  return (
    <section aria-label="Video" className="space-y-3 rounded-md border p-3">
      <h4 className="text-sm font-semibold">Video</h4>
      {video ? (
        <>
          <MediaPlayer source={{ title, playback_url: video.playback_url, poster_url: video.poster_url }}
            className={frameFor(video, 'max-w-2xl')} />
          <VideoMeta video={video} />
          <div className="flex flex-wrap items-center gap-2">
            {renderControls}
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
              {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileVideo className="mr-2 h-4 w-4" />}
              {upload.isPending ? `Uploading ${Math.round((progress ?? 0) * 100)}%` : 'Upload finished cut'}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" disabled={busy}
              onClick={() => window.confirm('Remove this video? The file is deleted.') && remove.mutate()}>
              <Trash2 className="mr-2 h-4 w-4" />Remove video
            </Button>
          </div>
        </>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Make a draft from the storyboard</p>
            <p className="text-xs text-muted-foreground">
              Each storyboard frame becomes a timed scene with its on-screen text and the voiceover as captions.
              Rendered on this computer with ffmpeg; no API keys, silent.
            </p>
            {renderControls}
          </div>
          <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files); }}
            className={cn('flex flex-col items-start gap-2 rounded-lg border border-dashed p-4',
              dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25')}>
            <p className="flex items-center gap-2 text-sm font-medium"><UploadCloud className="h-4 w-4" />Upload the finished cut</p>
            <p className="text-xs text-muted-foreground">
              {progress !== null ? `Uploading… ${Math.round(progress * 100)}%` : 'Drop the video you edited here, or choose it from your computer.'}
            </p>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
              {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileVideo className="mr-2 h-4 w-4" />}Choose video
            </Button>
          </div>
        </div>
      )}
      {render.isPending && (
        <p role="status" className="text-xs text-muted-foreground">Rendering on this computer; this usually takes under a minute.</p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
      <input ref={input} type="file" accept={VIDEO_ACCEPT} className="sr-only" tabIndex={-1}
        onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
    </section>
  );
}
