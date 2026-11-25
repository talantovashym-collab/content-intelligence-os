'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Brain, ExternalLink, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { CaptureForm } from '@/components/capture-form';
import { InlineError } from '@/components/source-note';
import { cn } from '@/lib/utils';
import { compactNumber, formatDuration, humanize, PLATFORM_LABELS, referencesApi, type Project, type Reference } from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Upload} color="from-violet-500 to-purple-500" title="Reference Library"
        description="Every video you saved, with real stats and captions, ready to investigate" />
      <ProjectGate>{(project) => <LibraryWorkspace key={project.id} project={project} />}</ProjectGate>
    </div>
  );
}

function LibraryWorkspace({ project }: { project: Project }) {
  const [filter, setFilter] = useState('');
  const references = useQuery({ queryKey: ['references', project.id], queryFn: () => referencesApi.list(project.id) });
  const shown = (references.data?.references ?? []).filter((r) =>
    `${r.title} ${r.creator_name ?? ''}`.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Add a reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CaptureForm projectId={project.id} />
          <p className="text-xs text-muted-foreground">
            Or find videos in <Link href="/research" className="underline">Reference Research</Link>.
          </p>
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
            <p className="py-6 text-center text-muted-foreground">Your library is empty.</p>
          )}
          {shown.map((r) => <ReferenceRow key={r.id} projectId={project.id} reference={r} />)}
        </CardContent>
      </Card>
    </>
  );
}

function ReferenceRow({ projectId, reference: r }: { projectId: string; reference: Reference }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['references', projectId] });
  const update = useMutation({ mutationFn: () => referencesApi.refresh(projectId, r.id), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => referencesApi.remove(projectId, r.id), onSuccess: refresh });
  const m = r.engagement_metrics ?? {};
  const transcript = r.reference_metadata?.transcript;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row">
      {r.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.thumbnail_url} alt="" className="aspect-video w-full shrink-0 rounded object-cover sm:w-40" />
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{r.title}</h3>
          <span className={cn('rounded px-2 py-0.5 text-xs', r.status === 'ANALYZED' ? 'bg-green-100 text-green-800' : 'bg-muted')}>
            {humanize(r.status)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {r.creator_name ?? 'Unknown creator'} · {r.source_platform ? PLATFORM_LABELS[r.source_platform] : 'Web'} ·{' '}
          {formatDuration(r.duration)}
          {r.published_at && ` · ${new Date(r.published_at).toLocaleDateString()}`}
        </p>
        <p className="text-sm">
          {compactNumber(m.views)} views · {compactNumber(m.likes)} likes · {compactNumber(m.comments)} comments
          {m.engagement_rate != null && ` · ${(m.engagement_rate * 100).toFixed(1)}% engagement`}
        </p>
        <p className="text-xs text-muted-foreground">
          {transcript ? `Transcript: ${transcript.segments.length} lines (${transcript.language}${transcript.automatic ? ', auto-generated' : ''})` : 'No captions available'}
          {m.fetched_at && ` · stats from ${new Date(m.fetched_at).toLocaleString()}`}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" asChild>
            <Link href={`/investigation?reference=${r.id}`}><Brain className="mr-2 h-4 w-4" />Investigate</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => update.mutate()} disabled={update.isPending}>
            <RefreshCw className={cn('mr-2 h-4 w-4', update.isPending && 'animate-spin')} />Refresh stats
          </Button>
          {r.source_url && (
            <Button size="sm" variant="ghost" asChild>
              <a href={r.source_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open</a>
            </Button>
          )}
          <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive"
            disabled={remove.isPending}
            onClick={() => window.confirm(`Remove "${r.title}" and its investigations from the library?`) && remove.mutate()}>
            <Trash2 className="mr-2 h-4 w-4" />Remove
          </Button>
        </div>
        <InlineError error={update.error ?? remove.error} />
      </div>
    </div>
  );
}
