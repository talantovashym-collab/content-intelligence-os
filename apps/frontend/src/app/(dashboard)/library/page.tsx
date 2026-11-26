'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Brain, ExternalLink, Loader2, Play, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { CaptureForm } from '@/components/capture-form';
import { InlineError } from '@/components/source-note';
import { MediaPlayer } from '@/components/media/media-player';
import { UploadDropzone } from '@/components/media/upload-dropzone';
import { cn } from '@/lib/utils';
import { compactNumber, formatDuration, humanize, mediaUrl, PLATFORM_LABELS, referencesApi, type Project, type Reference } from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Upload} color="from-violet-500 to-purple-500" title="Reference Library"
        description="Every video you saved or uploaded, with stats and transcripts, ready to watch and investigate" />
      <ProjectGate>{(project) => <LibraryWorkspace key={project.id} project={project} />}</ProjectGate>
    </div>
  );
}

const isUpload = (r: Reference) => Boolean(r.playback_url) || Boolean(r.reference_metadata?.upload);

function LibraryWorkspace({ project }: { project: Project }) {
  const [filter, setFilter] = useState('');
  const references = useQuery({
    queryKey: ['references', project.id],
    queryFn: () => referencesApi.list(project.id),
    // Keep checking while uploads are being transcribed in the background
    refetchInterval: (q) => (q.state.data?.references.some((r) => r.status === 'INDEXING') ? 4000 : false),
  });
  const shown = (references.data?.references ?? []).filter((r) =>
    `${r.title} ${r.creator_name ?? ''}`.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Add a reference</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <UploadDropzone projectId={project.id} />
          <div className="space-y-2">
            <p className="text-sm font-medium">Or paste a link</p>
            <CaptureForm projectId={project.id} />
            <p className="text-xs text-muted-foreground">
              YouTube, TikTok, Instagram and more: stats and captions are fetched for you. You can also find videos in{' '}
              <Link href="/research" className="underline">Reference Research</Link>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-xl">
            Library
            {references.data && <span className="ml-2 text-base font-normal text-muted-foreground">({references.data.total})</span>}
          </CardTitle>
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className="max-w-xs" aria-label="Filter references" />
        </CardHeader>
        <CardContent className="space-y-3">
          {references.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          <InlineError error={references.error} />
          {references.data?.references.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">Your library is empty. Drop a video above or paste a link.</p>
          )}
          {shown.map((r) => <ReferenceRow key={r.id} projectId={project.id} reference={r} />)}
        </CardContent>
      </Card>
    </>
  );
}

function ReferenceRow({ projectId, reference: r }: { projectId: string; reference: Reference }) {
  const queryClient = useQueryClient();
  const [watching, setWatching] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['references', projectId] });
  const update = useMutation({ mutationFn: () => referencesApi.refresh(projectId, r.id), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => referencesApi.remove(projectId, r.id), onSuccess: refresh });
  const m = r.engagement_metrics ?? {};
  const transcript = r.reference_metadata?.transcript;
  const upload = isUpload(r);
  const transcribing = r.status === 'INDEXING';
  const thumb = mediaUrl(r.poster_url) ?? r.thumbnail_url;
  const canPlay = Boolean(r.playback_url || r.source_url);

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        {canPlay && !watching && (
          <button type="button" onClick={() => setWatching(true)} aria-label={`Watch ${r.title}`}
            className="group relative aspect-video w-full shrink-0 overflow-hidden rounded bg-muted sm:w-40">
            {thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="h-full w-full object-cover" />
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover:bg-black/30">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-black shadow">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </span>
          </button>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{r.title}</h3>
            <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs',
              r.status === 'ANALYZED' ? 'bg-green-100 text-green-800' : transcribing ? 'bg-blue-100 text-blue-800' : 'bg-muted')}>
              {transcribing && <Loader2 className="h-3 w-3 animate-spin" />}
              {transcribing ? 'Transcribing' : humanize(r.status)}
            </span>
            {upload && <span className="rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-800">Uploaded</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            {upload
              ? <>{r.reference_metadata?.upload?.filename ?? 'Uploaded file'} · {r.media_type === 'AUDIO' ? 'Audio' : 'Video'}</>
              : <>{r.creator_name ?? 'Unknown creator'} · {r.source_platform ? PLATFORM_LABELS[r.source_platform] : 'Web'}</>}
            {' · '}{formatDuration(r.duration)}
            {r.published_at && ` · ${new Date(r.published_at).toLocaleDateString()}`}
          </p>
          {!upload && (
            <p className="text-sm">
              {compactNumber(m.views)} views · {compactNumber(m.likes)} likes · {compactNumber(m.comments)} comments
              {m.engagement_rate != null && ` · ${(m.engagement_rate * 100).toFixed(1)}% engagement`}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {transcript
              ? `Transcript: ${transcript.segments.length} lines${transcript.language ? ` (${transcript.language}${transcript.automatic ? ', auto-generated' : ''})` : ''}`
              : transcribing ? 'Making the transcript with your AI key…' : upload ? 'No transcript yet' : 'No captions available'}
            {m.fetched_at && ` · stats from ${new Date(m.fetched_at).toLocaleString()}`}
          </p>
          {r.error_message && !transcribing && (
            <p className="flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {r.error_message}
                {/key/i.test(r.error_message) && <> <Link href="/settings#ai-keys" className="underline">Add a key</Link>, then transcribe again.</>}
              </span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" asChild>
              <Link href={`/investigation?reference=${r.id}`}><Brain className="mr-2 h-4 w-4" />Investigate</Link>
            </Button>
            {canPlay && (
              <Button size="sm" variant="outline" onClick={() => setWatching((w) => !w)}>
                {watching ? <X className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{watching ? 'Close player' : 'Watch'}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => update.mutate()} disabled={update.isPending || transcribing}>
              <RefreshCw className={cn('mr-2 h-4 w-4', (update.isPending || transcribing) && 'animate-spin')} />
              {upload ? 'Transcribe again' : 'Refresh stats'}
            </Button>
            {r.source_url && (
              <Button size="sm" variant="ghost" asChild>
                <a href={r.source_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open</a>
              </Button>
            )}
            <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive"
              disabled={remove.isPending}
              onClick={() => window.confirm(`Remove "${r.title}"${upload ? ', its file' : ''} and its investigations from the library?`) && remove.mutate()}>
              <Trash2 className="mr-2 h-4 w-4" />Remove
            </Button>
          </div>
          <InlineError error={update.error ?? remove.error} />
        </div>
      </div>
      {watching && (
        <div className="mt-3">
          <MediaPlayer autoLoad source={{ ...r, video_id: r.reference_metadata?.video_id }} className="max-h-[70vh]" />
        </div>
      )}
    </div>
  );
}
