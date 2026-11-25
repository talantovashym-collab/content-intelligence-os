'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle, ChevronDown, Loader2, Palette, Trash2, XCircle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DataView, isEmpty } from '@/components/data-view';
import { cn } from '@/lib/utils';
import { PLATFORMS, PLATFORM_LABELS, humanize, strategiesApi, type Project, type Strategy } from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

export default function StrategyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
          <Palette className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creative Strategy</h1>
          <p className="text-muted-foreground mt-1">
            Generate creative strategies, review them, and approve the ones that should go to production
          </p>
        </div>
      </div>
      <ProjectGate>{(project) => <StrategyWorkspace key={project.id} project={project} />}</ProjectGate>
    </div>
  );
}

function StrategyWorkspace({ project }: { project: Project }) {
  const strategies = useQuery({
    queryKey: ['strategies', project.id],
    queryFn: () => strategiesApi.list(project.id),
  });

  return (
    <>
      <StrategyForm project={project} />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Strategies in {project.title}
            {strategies.data && <span className="ml-2 text-base font-normal text-muted-foreground">({strategies.data.total})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {strategies.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {strategies.isError && <p className="text-sm text-destructive">{strategies.error.message}</p>}
          {strategies.data?.strategies.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">No strategies yet. Generate one above.</p>
          )}
          {strategies.data?.strategies.map((s) => (
            <StrategyCard key={s.strategy_id} projectId={project.id} strategy={s} />
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function StrategyForm({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState('');
  const [concept, setConcept] = useState('');
  const [audience, setAudience] = useState(project.target_audience ?? '');
  const [duration, setDuration] = useState('60');
  const [tone, setTone] = useState('engaging');
  const [format, setFormat] = useState('educational');
  const [platforms, setPlatforms] = useState<string[]>(() =>
    project.platforms.length ? project.platforms.map((p) => p.toLowerCase()) : ['youtube']
  );

  const create = useMutation({
    mutationFn: () =>
      strategiesApi.create(project.id, {
        topic: topic.trim(),
        concept: concept.trim(),
        target_audience: audience.trim(),
        duration_preference: Number(duration),
        tone: tone.trim() || 'engaging',
        format_preference: format.trim() || 'educational',
        platform_targets: platforms,
      }),
    onSuccess: () => {
      setTopic('');
      setConcept('');
      queryClient.invalidateQueries({ queryKey: ['strategies', project.id] });
    },
  });

  const togglePlatform = (p: string) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Generate a strategy</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium mb-1.5">Topic</label>
              <Input id="topic" required minLength={3} maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., AI budgeting apps for Gen Z" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="duration" className="block text-sm font-medium mb-1.5">Duration (s)</label>
                <Input id="duration" type="number" required min={5} max={3600} value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <div>
                <label htmlFor="tone" className="block text-sm font-medium mb-1.5">Tone</label>
                <Input id="tone" value={tone} onChange={(e) => setTone(e.target.value)} />
              </div>
              <div>
                <label htmlFor="format" className="block text-sm font-medium mb-1.5">Format</label>
                <Input id="format" value={format} onChange={(e) => setFormat(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="concept" className="block text-sm font-medium mb-1.5">Core concept</label>
              <Textarea id="concept" required minLength={10} maxLength={5000} value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="What is the video about, and what should it achieve? (at least 10 characters)" className="min-h-[90px]" />
            </div>
            <div>
              <label htmlFor="audience" className="block text-sm font-medium mb-1.5">Target audience</label>
              <Textarea id="audience" required minLength={10} maxLength={2000} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Who is it for? (at least 10 characters)" className="min-h-[90px]" />
            </div>
          </div>
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
          {create.isError && <p role="alert" className="text-sm text-destructive">{create.error.message}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={create.isPending || platforms.length === 0}>
            {create.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            {create.isPending ? 'Generating…' : 'Generate Strategy'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const TEXT_FIELDS: [keyof Strategy, string][] = [
  ['creative_angle', 'Creative angle'],
  ['core_message', 'Core message'],
  ['emotional_objective', 'Emotional objective'],
  ['hook_direction', 'Hook direction'],
  ['narrative_formula', 'Narrative formula'],
  ['visual_style', 'Visual style'],
  ['animation_style', 'Animation style'],
  ['differentiation', 'Differentiation'],
];

function StrategyCard({ projectId, strategy }: { projectId: string; strategy: Strategy }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(strategy.approval_feedback ?? '');
  useEffect(() => setFeedback(strategy.approval_feedback ?? ''), [strategy.approval_feedback]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['strategies', projectId] });
  const review = useMutation({
    mutationFn: (approved: boolean) => strategiesApi.approve(projectId, strategy.strategy_id, approved, feedback.trim()),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => strategiesApi.remove(projectId, strategy.strategy_id),
    onSuccess: refresh,
  });

  const status = strategy.is_approved
    ? { label: 'Approved', className: 'bg-green-100 text-green-800' }
    : strategy.approval_feedback
      ? { label: 'Changes requested', className: 'bg-red-100 text-red-800' }
      : { label: 'Awaiting review', className: 'bg-yellow-100 text-yellow-800' };

  const error = review.error ?? remove.error;

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-4 p-4 text-left hover:bg-muted/40"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{strategy.topic}</h3>
            <span className={cn('rounded px-2 py-0.5 text-xs', status.className)}>{status.label}</span>
            <span className="text-xs text-muted-foreground">{strategy.duration}s</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{strategy.creative_angle || strategy.concept}</p>
        </div>
        <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-4 border-t p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {TEXT_FIELDS.map(([key, title]) => (
              <div key={key}>
                <p className="text-xs font-medium text-muted-foreground">{title}</p>
                <p className="text-sm whitespace-pre-wrap">{String(strategy[key] || '—')}</p>
              </div>
            ))}
          </div>
          {!isEmpty(strategy.platform_adaptations) && (
            <div>
              <p className="mb-1 text-sm font-semibold">Platform adaptations</p>
              <DataView value={strategy.platform_adaptations} />
            </div>
          )}
          {!isEmpty(strategy.alternatives) && (
            <div>
              <p className="mb-1 text-sm font-semibold">Alternatives</p>
              <DataView value={strategy.alternatives} />
            </div>
          )}

          <div className="space-y-2 rounded-md bg-muted/40 p-3">
            <label htmlFor={`fb-${strategy.strategy_id}`} className="block text-sm font-medium">Review feedback</label>
            <Textarea
              id={`fb-${strategy.strategy_id}`}
              maxLength={5000}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Optional note for approval, or what should change"
              className="min-h-[60px] bg-background"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" disabled={review.isPending} onClick={() => review.mutate(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate(false)}>
                <XCircle className="h-4 w-4 mr-2" />
                Request changes
              </Button>
              {strategy.is_approved && (
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/production?strategy=${strategy.strategy_id}`}>
                    Create production
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-muted-foreground hover:text-destructive"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Delete the strategy "${strategy.topic}"? This cannot be undone.`)) remove.mutate();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
