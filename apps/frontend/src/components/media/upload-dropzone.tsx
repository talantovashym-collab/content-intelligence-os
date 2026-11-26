'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, FileVideo, Loader2, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UPLOAD_ACCEPT, UPLOAD_MAX_MB, referencesApi } from '@/lib/api';

type Item = {
  id: string;
  file: File;
  progress: number;
  state: 'queued' | 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
  controller: AbortController;
};

const EXTS = UPLOAD_ACCEPT.split(',').filter((x) => x.startsWith('.'));

function precheck(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (!EXTS.includes(ext)) return `Not a supported video or audio file (${EXTS.join(' ')})`;
  if (file.size > UPLOAD_MAX_MB * 1024 * 1024) return `Larger than the ${UPLOAD_MAX_MB} MB limit`;
  if (file.size === 0) return 'The file is empty';
  return null;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Drag videos/audio from the desktop, or pick them, to add them to the project's library. */
export function UploadDropzone({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const running = useRef(false);
  const queue = useRef<Item[]>([]);

  const patch = (id: string, change: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...change } : it)));

  // One upload at a time: friendlier to home connections and to the transcription queue
  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) {
      const item = queue.current.shift()!;
      if (item.controller.signal.aborted) continue;
      patch(item.id, { state: 'uploading' });
      try {
        await referencesApi.upload(projectId, item.file, (f) => {
          patch(item.id, f >= 1 ? { progress: 1, state: 'processing' } : { progress: f });
        }, item.controller.signal);
        patch(item.id, { state: 'done', progress: 1 });
        queryClient.invalidateQueries({ queryKey: ['references', projectId] });
      } catch (e) {
        patch(item.id, { state: 'error', error: (e as Error).message });
      }
    }
    running.current = false;
  }, [projectId, queryClient]);

  const add = (files: FileList | File[]) => {
    const fresh: Item[] = Array.from(files).map((file) => {
      const error = precheck(file);
      return { id: `${file.name}-${file.size}-${Math.random()}`, file, progress: 0,
        state: error ? 'error' : 'queued', error: error ?? undefined, controller: new AbortController() };
    });
    setItems((list) => [...fresh, ...list].slice(0, 30));
    queue.current.push(...fresh.filter((f) => f.state === 'queued'));
    void pump();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (e.dataTransfer.files?.length) add(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(e) => { e.preventDefault(); depth.current += 1; setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDragLeave={() => { depth.current -= 1; if (depth.current <= 0) setDragging(false); }}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/40',
        )}
      >
        <UploadCloud className={cn('h-9 w-9', dragging ? 'text-primary' : 'text-muted-foreground')} />
        <div>
          <p className="font-medium">{dragging ? 'Drop to upload' : 'Drag videos or audio here'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            MP4, MOV, WebM, MKV, MP3, WAV, M4A… up to {UPLOAD_MAX_MB} MB each. Transcribed with your own OpenAI or Groq key.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => input.current?.click()}>
          <FileVideo className="mr-2 h-4 w-4" /> Choose files
        </Button>
        <input ref={input} type="file" multiple accept={UPLOAD_ACCEPT} className="sr-only" tabIndex={-1}
          onChange={(e) => { if (e.target.files?.length) add(e.target.files); e.target.value = ''; }} />
      </div>

      {items.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm" aria-live="polite">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="w-5 shrink-0">
                {it.state === 'done' && <CheckCircle className="h-4 w-4 text-green-600" />}
                {(it.state === 'uploading' || it.state === 'processing') && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {it.state === 'error' && <X className="h-4 w-4 text-destructive" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{it.file.name} <span className="font-normal text-muted-foreground">· {formatSize(it.file.size)}</span></p>
                {it.state === 'uploading' && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar"
                    aria-valuenow={Math.round(it.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-primary transition-[width]" style={{ width: `${it.progress * 100}%` }} />
                  </div>
                )}
                <p className={cn('text-xs', it.state === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                  {it.state === 'queued' && 'Waiting…'}
                  {it.state === 'uploading' && `Uploading ${Math.round(it.progress * 100)}%`}
                  {it.state === 'processing' && 'Checking the file and making a thumbnail…'}
                  {it.state === 'done' && 'Added to the library. The transcript is being made in the background.'}
                  {it.state === 'error' && it.error}
                </p>
              </div>
              {(it.state === 'queued' || it.state === 'uploading') && (
                <Button type="button" size="sm" variant="ghost"
                  onClick={() => { it.controller.abort(); if (it.state === 'queued') patch(it.id, { state: 'error', error: 'Cancelled' }); }}>
                  Cancel
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
