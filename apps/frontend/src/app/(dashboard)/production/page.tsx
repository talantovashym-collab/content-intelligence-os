'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Clapperboard, Film, Loader2, Trash2, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataView, isEmpty } from '@/components/data-view';
import { ProductionVideoPanel, VideoGallery, videosKey } from '@/components/media/production-videos';
import { cn } from '@/lib/utils';
import {
  CREATIVE_FORMATS,
  PLATFORMS,
  PLATFORM_LABELS,
  humanize,
  productionsApi,
  strategiesApi,
  type CreativeFormat,
  type Production,
  type ProductionVideo,
  type Project,
  type Strategy,
} from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

const FORMAT_COLORS: Record<CreativeFormat, string> = {
  STICKMAN: 'from-blue-500 to-cyan-500',
  DOODLE: 'from-purple-500 to-pink-500',
  WHITEBOARD: 'from-green-500 to-emerald-500',
  CARTOON: 'from-pink-500 to-rose-500',
  MOTION_GRAPHICS: 'from-violet-500 to-purple-500',
  CINEMATIC: 'from-amber-500 to-orange-500',
  DOCUMENTARY: 'from-indigo-500 to-blue-500',
  EDUCATIONAL: 'from-teal-500 to-cyan-500',
};

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-muted text-foreground',
  queued: 'bg-yellow-100 text-yellow-800',
  rendering: 'bg-blue-100 text-blue-800',
  review: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  archived: 'bg-muted text-muted-foreground',
};

/** Production sections in reading order. */
const SECTIONS: [keyof Production, string][] = [
  ['script', 'Script'],
  ['hooks', 'Hooks'],
  ['voiceover', 'Voiceover'],
  ['storyboard', 'Storyboard'],
  ['character_designs', 'Character designs'],
  ['animation_instructions', 'Animation instructions'],
  ['visual_prompts', 'Visual prompts'],
  ['image_assets', 'Image assets'],
  ['video_assets', 'Video assets'],
  ['sound_design', 'Sound design'],
  ['music_direction', 'Music direction'],
  ['editing_instructions', 'Editing instructions'],
  ['captions', 'Captions'],
  ['subtitles', 'Subtitles'],
  ['timeline', 'Timeline'],
];

export default function ProductionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500">
          <Clapperboard className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Studio</h1>
          <p className="text-muted-foreground mt-1">
            Turn an approved strategy into a script and storyboard, render a draft video, and watch your finished cuts
          </p>
        </div>
      </div>
      <ProjectGate>
        {(project) => (
          // ProductionWorkspace reads ?strategy=, which needs a Suspense boundary
          <Suspense>
            <ProductionWorkspace key={project.id} project={project} />
          </Suspense>
        )}
      </ProjectGate>
    </div>
  );
}

function ProductionWorkspace({ project }: { project: Project }) {
  const strategies = useQuery({
    queryKey: ['strategies', project.id],
    queryFn: () => strategiesApi.list(project.id),
  });
  const productions = useQuery({
    queryKey: ['productions', project.id],
    queryFn: () => productionsApi.list(project.id),
  });

  const videos = useQuery({
    queryKey: videosKey(project.id),
    queryFn: () => productionsApi.videos(project.id),
    // Signed playback links expire after a few hours; refresh them well before
    refetchInterval: 30 * 60 * 1000,
  });

  const topics = new Map(strategies.data?.strategies.map((s) => [s.strategy_id, s.topic]));
  const ownVideo = new Map<string, ProductionVideo>(
    videos.data?.filter((v) => v.kind === 'production').map((v) => [v.production_id, v]),
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Film className="h-5 w-5" />Videos
            {videos.data && videos.data.length > 0 && (
              <span className="text-base font-normal text-muted-foreground">({videos.data.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VideoGallery videos={videos.data} loading={videos.isLoading} error={videos.error} />
        </CardContent>
      </Card>
      <NewProduction
        project={project}
        approved={strategies.data?.strategies.filter((s) => s.is_approved) ?? []}
        loading={strategies.isLoading}
        loadError={strategies.error}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Productions in {project.title}
            {productions.data && <span className="ml-2 text-base font-normal text-muted-foreground">({productions.data.total})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {productions.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {productions.isError && <p className="text-sm text-destructive">{productions.error.message}</p>}
          {productions.data?.productions.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">No productions yet.</p>
          )}
          {productions.data?.productions.map((p) => (
            <ProductionCard key={p.id} production={p} topic={topics.get(p.strategy_id)} video={ownVideo.get(p.id)} />
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function NewProduction({
  project,
  approved,
  loading,
  loadError,
}: {
  project: Project;
  approved: Strategy[];
  loading: boolean;
  loadError: Error | null;
}) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [strategyId, setStrategyId] = useState('');
  const [format, setFormat] = useState<CreativeFormat>('EDUCATIONAL');
  const [platforms, setPlatforms] = useState<string[]>(() =>
    project.platforms.length ? project.platforms.map((p) => p.toLowerCase()) : ['youtube']
  );

  // Preselect the strategy from ?strategy= (the "Create production" link), else the newest approved one
  useEffect(() => {
    if (strategyId || approved.length === 0) return;
    const wanted = searchParams.get('strategy');
    setStrategyId(approved.find((s) => s.strategy_id === wanted)?.strategy_id ?? approved[0].strategy_id);
  }, [approved, strategyId, searchParams]);

  const generate = useMutation({
    mutationFn: () => productionsApi.generate(project.id, strategyId, format, platforms),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productions', project.id] }),
  });

  const togglePlatform = (p: string) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">New production</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError.message}</p>
        ) : approved.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="font-medium">No approved strategy yet</p>
            <p className="mt-1 text-sm text-muted-foreground">A production is generated from an approved creative strategy.</p>
            <Link href="/strategy" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Go to Creative Strategy
            </Link>
          </div>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              generate.mutate();
            }}
          >
            <div>
              <label htmlFor="strategy" className="block text-sm font-medium mb-1.5">Approved strategy</label>
              <select
                id="strategy"
                value={strategyId}
                onChange={(e) => setStrategyId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {approved.map((s) => (
                  <option key={s.strategy_id} value={s.strategy_id}>
                    {s.topic} ({s.duration}s)
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium mb-1.5">Format</legend>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {CREATIVE_FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    aria-pressed={format === f}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 text-left text-sm font-medium transition-all hover:border-primary/50',
                      format === f && 'border-primary ring-1 ring-primary'
                    )}
                  >
                    <span className={cn('h-6 w-6 shrink-0 rounded-md bg-gradient-to-br', FORMAT_COLORS[f])} />
                    {humanize(f)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="block text-sm font-medium mb-1.5">Platforms</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {PLATFORMS.map((P) => {
                  const p = P.toLowerCase();
                  return (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={platforms.includes(p)} onChange={() => togglePlatform(p)} className="rounded border-input" />
                      {PLATFORM_LABELS[P]}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {generate.isError && <p role="alert" className="text-sm text-destructive">{generate.error.message}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={generate.isPending || !strategyId || platforms.length === 0}>
              {generate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              {generate.isPending ? 'Generating…' : 'Generate Production'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function ProductionCard({ production, topic, video }: { production: Production; topic?: string; video?: ProductionVideo }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => productionsApi.remove(production.project_id, production.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productions', production.project_id] });
      queryClient.invalidateQueries({ queryKey: videosKey(production.project_id) });
    },
  });
  const sections = SECTIONS.filter(([key]) => !isEmpty(production[key]));

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-muted/40"
        aria-expanded={open}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{topic ?? 'Production'}</h3>
          <span className="rounded bg-muted px-2 py-0.5 text-xs">{humanize(production.format)}</span>
          <span className={cn('rounded px-2 py-0.5 text-xs', STATUS_STYLE[production.status] ?? 'bg-muted')}>{production.status}</span>
          {video && (
            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Film className="h-3 w-3" />{video.source === 'render' ? 'Draft video' : 'Video'}
            </span>
          )}
          <span className="text-xs text-muted-foreground">v{production.version}</span>
          <span className="text-xs text-muted-foreground">{new Date(production.created_at).toLocaleString()}</span>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-4 border-t p-4">
          <ProductionVideoPanel projectId={production.project_id} productionId={production.id}
            title={topic ?? 'Production'} video={video} />
          {sections.length === 0 && <p className="text-sm text-muted-foreground">This production has no generated content.</p>}
          {sections.map(([key, title]) => (
            <details key={key} className="rounded-md border bg-muted/20 p-3" open={key === 'script'}>
              <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
              <div className="mt-2">
                <DataView value={production[key]} />
              </div>
            </details>
          ))}
          <div className="flex items-center justify-end gap-2">
            {remove.isError && <p className="mr-auto text-sm text-destructive">{remove.error.message}</p>}
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm('Delete this production? This cannot be undone.')) remove.mutate();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
