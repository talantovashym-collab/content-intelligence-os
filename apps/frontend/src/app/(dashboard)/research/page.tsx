'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Loader2, Plus, Search, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { CaptureForm } from '@/components/capture-form';
import { InlineError } from '@/components/source-note';
import { compactNumber, formatDuration, referencesApi, type Project, type SearchResult } from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

type Sort = 'relevance' | 'views' | 'date';

export default function ResearchPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Video} color="from-purple-500 to-pink-500" title="Reference Research"
        description="Search real videos to study, and add the best ones to your reference library" />
      <ProjectGate>{(project) => <ResearchWorkspace key={project.id} project={project} />}</ProjectGate>
    </div>
  );
}

function ResearchWorkspace({ project }: { project: Project }) {
  const [input, setInput] = useState(project.niche ?? '');
  const [query, setQuery] = useState<{ q: string; sort: Sort } | null>(null);
  const [sort, setSort] = useState<Sort>('relevance');

  const results = useQuery({
    queryKey: ['research', project.id, query],
    queryFn: () => referencesApi.search(project.id, query!.q, query!.sort),
    enabled: !!query,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Search YouTube</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => { e.preventDefault(); if (input.trim().length >= 2) setQuery({ q: input.trim(), sort }); }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={input} onChange={(e) => setInput(e.target.value)} className="pl-9"
                placeholder="What do you want to study? e.g., budgeting tips for students" aria-label="Search query" />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="relevance">Most relevant</option>
              <option value="views">Most viewed</option>
              <option value="date">Newest</option>
            </select>
            <Button type="submit" disabled={results.isFetching || input.trim().length < 2}>
              {results.isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Search
            </Button>
          </form>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium">Or add a video directly</p>
            <CaptureForm projectId={project.id} />
          </div>
        </CardContent>
      </Card>

      {query && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Results for “{query.q}”</CardTitle>
          </CardHeader>
          <CardContent>
            {results.isFetching && !results.data && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            <InlineError error={results.error} />
            {results.data?.length === 0 && <p className="py-6 text-center text-muted-foreground">No videos found.</p>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.data?.map((v) => <ResultCard key={v.url} projectId={project.id} video={v} />)}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function ResultCard({ projectId, video }: { projectId: string; video: SearchResult }) {
  const queryClient = useQueryClient();
  const capture = useMutation({
    mutationFn: () => referencesApi.capture(projectId, video.url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references', projectId] });
      queryClient.invalidateQueries({ queryKey: ['research', projectId] });
    },
  });
  const inLibrary = !!video.reference_id || capture.isSuccess;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border">
      {video.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.thumbnail_url} alt="" className="aspect-video w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <a href={video.url} target="_blank" rel="noreferrer" className="line-clamp-2 font-medium hover:underline">
          {video.title}
        </a>
        <p className="text-xs text-muted-foreground">
          {video.creator} · {compactNumber(video.views)} views · {formatDuration(video.duration)}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-1">
          {inLibrary ? (
            <Button size="sm" variant="outline" asChild>
              <Link href="/library"><Check className="mr-2 h-4 w-4" />In library</Link>
            </Button>
          ) : (
            <Button size="sm" onClick={() => capture.mutate()} disabled={capture.isPending}>
              {capture.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add to library
            </Button>
          )}
          <a href={video.url} target="_blank" rel="noreferrer" aria-label="Open video"
            className="ml-auto text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <InlineError error={capture.error} />
      </div>
    </div>
  );
}
