'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, FlaskConical, Loader2, Trash2, Trophy, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DataView } from '@/components/data-view';
import { PageHeader } from '@/components/layout/page-header';
import { InlineError, SourceNote } from '@/components/source-note';
import { cn } from '@/lib/utils';
import {
  TEST_TYPES, humanize, knowledgeApi, productionsApi, strategiesApi, testsApi, type Production, type Project, type Test,
} from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

export default function TestingPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={FlaskConical} color="from-yellow-500 to-lime-500" title="Testing Lab"
        description="Generate variants to A/B test, predict a winner, then record what actually won" />
      <ProjectGate>{(project) => <TestingWorkspace key={project.id} project={project} />}</ProjectGate>
    </div>
  );
}

function useProductionLabels(projectId: string) {
  const strategies = useQuery({ queryKey: ['strategies', projectId], queryFn: () => strategiesApi.list(projectId) });
  const productions = useQuery({ queryKey: ['productions', projectId], queryFn: () => productionsApi.list(projectId) });
  const topics = new Map(strategies.data?.strategies.map((s) => [s.strategy_id, s.topic]));
  const label = (p: Production) => `${topics.get(p.strategy_id) ?? 'Production'} · ${humanize(p.format)} v${p.version}`;
  return { productions, label };
}

function TestingWorkspace({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const { productions, label } = useProductionLabels(project.id);
  const tests = useQuery({ queryKey: ['tests', project.id], queryFn: () => testsApi.list(project.id) });
  const [productionId, setProductionId] = useState('');
  const [testType, setTestType] = useState<string>('HOOK_ALTERNATIVE');
  const [count, setCount] = useState(3);

  useEffect(() => {
    const list = productions.data?.productions ?? [];
    if (!productionId && list.length) setProductionId(list[0].id);
  }, [productions.data, productionId]);

  const generate = useMutation({
    mutationFn: () => testsApi.generate(project.id, productionId, testType, count),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tests', project.id] }),
  });
  const byId = new Map(productions.data?.productions.map((p) => [p.id, p]));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">New test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {productions.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {productions.data?.productions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Tests are built from a production. <Link href="/production" className="text-primary underline">Create one in Production Studio</Link>
            </p>
          )}
          {!!productions.data?.productions.length && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); generate.mutate(); }}>
              <div className="grid gap-4 md:grid-cols-[2fr_1fr_auto]">
                <label className="text-sm font-medium">
                  Production
                  <select value={productionId} onChange={(e) => setProductionId(e.target.value)}
                    className="mt-1.5 block h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {productions.data.productions.map((p) => <option key={p.id} value={p.id}>{label(p)}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  What to test
                  <select value={testType} onChange={(e) => setTestType(e.target.value)}
                    className="mt-1.5 block h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {TEST_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Variants
                  <select value={count} onChange={(e) => setCount(Number(e.target.value))}
                    className="mt-1.5 block h-10 w-24 rounded-md border border-input bg-background px-3 text-sm">
                    {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
              <InlineError error={generate.error} />
              <Button type="submit" size="lg" className="w-full" disabled={generate.isPending || !productionId}>
                {generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {generate.isPending ? 'Generating variants…' : 'Generate test'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Tests{tests.data && <span className="ml-2 text-base font-normal text-muted-foreground">({tests.data.total})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tests.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          <InlineError error={tests.error} />
          {tests.data?.tests.length === 0 && <p className="py-6 text-center text-muted-foreground">No tests yet.</p>}
          {tests.data?.tests.map((t) => {
            const p = t.production_id ? byId.get(t.production_id) : undefined;
            return <TestCard key={t.id} projectId={project.id} test={t} productionLabel={p ? label(p) : undefined} />;
          })}
        </CardContent>
      </Card>
    </>
  );
}

function TestCard({ projectId, test: t, productionLabel }: { projectId: string; test: Test; productionLabel?: string }) {
  const queryClient = useQueryClient();
  const variants = t.variants?.items ?? [];
  const [winner, setWinner] = useState(t.results?.winner ?? '');
  const [notes, setNotes] = useState(t.results?.notes ?? '');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['tests', projectId] });

  const save = useMutation({
    mutationFn: () => testsApi.update(projectId, t.id, { results: { winner, notes }, status: 'completed' }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: () => testsApi.remove(projectId, t.id), onSuccess: refresh });
  const learn = useMutation({
    mutationFn: () => {
      const won = variants.find((v) => v.label === t.results?.winner);
      return knowledgeApi.create(projectId, {
        category: 'testing',
        title: `${humanize(t.test_type)}: variant ${t.results?.winner} won`,
        content: { winner: won?.content, why: won?.rationale, notes: t.results?.notes, hypothesis: t.performance_hypothesis },
        source_type: 'test',
        confidence_level: 0.6,
        tags: ['ab-test', t.test_type.toLowerCase()],
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledge', projectId] }),
  });

  return (
    <details className="rounded-lg border p-3" open={t.status !== 'completed'}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-2">
        <span className="font-semibold">{humanize(t.test_type)}</span>
        <span className={cn('rounded px-2 py-0.5 text-xs', t.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
          {t.status}
        </span>
        {t.results?.winner && <span className="flex items-center gap-1 text-xs"><Trophy className="h-3.5 w-3.5 text-amber-500" />Variant {t.results.winner}</span>}
        {productionLabel && <span className="text-xs text-muted-foreground">{productionLabel}</span>}
      </summary>
      <div className="mt-3 space-y-4">
        <SourceNote source={t.variants?.source} />
        <div className="grid gap-2 md:grid-cols-2">
          {variants.map((v) => (
            <label key={v.label} className={cn('flex cursor-pointer gap-3 rounded-md border p-3', winner === v.label && 'border-primary ring-1 ring-primary')}>
              <input type="radio" name={`winner-${t.id}`} value={v.label} checked={winner === v.label} onChange={() => setWinner(v.label)} className="mt-1" />
              <span className="min-w-0 space-y-1">
                <span className="block text-sm font-semibold">Variant {v.label}</span>
                <span className="block whitespace-pre-wrap text-sm">{v.content}</span>
                {v.rationale && <span className="block text-xs text-muted-foreground">{v.rationale}</span>}
                {v.predicted_score != null && (
                  <span className="block text-xs text-muted-foreground">Predicted score: {Math.round(v.predicted_score * 100)}</span>
                )}
              </span>
            </label>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Hypothesis</p>
            <DataView value={t.performance_hypothesis} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">How to run it</p>
            <DataView value={t.audience_experiment} />
          </div>
        </div>
        <div>
          <label htmlFor={`notes-${t.id}`} className="mb-1.5 block text-sm font-medium">Result notes</label>
          <Textarea id={`notes-${t.id}`} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened? e.g., B held 12% more viewers at 3 seconds" className="min-h-[60px]" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !winner}>
            <Trophy className="mr-2 h-4 w-4" />Record winner
          </Button>
          {t.status === 'completed' && t.results?.winner && (
            <Button size="sm" variant="outline" onClick={() => learn.mutate()} disabled={learn.isPending || learn.isSuccess}>
              <BookOpen className="mr-2 h-4 w-4" />{learn.isSuccess ? 'Saved to Knowledge Base' : 'Save as learning'}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" disabled={remove.isPending}
            onClick={() => window.confirm('Delete this test?') && remove.mutate()}>
            <Trash2 className="mr-2 h-4 w-4" />Delete
          </Button>
        </div>
        <InlineError error={save.error ?? remove.error ?? learn.error} />
      </div>
    </details>
  );
}
