'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, CheckCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DataView } from '@/components/data-view';
import { PageHeader } from '@/components/layout/page-header';
import { InlineError } from '@/components/source-note';
import { cn } from '@/lib/utils';
import { humanize, knowledgeApi, type KnowledgeEntry, type Project } from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

const DEFAULT_CATEGORIES = ['hooks', 'pacing', 'topics', 'formats', 'audience', 'publishing', 'testing', 'creative_dna'];
const SOURCE_LABELS: Record<string, string> = {
  manual: 'Added by you',
  analytics: 'From analytics',
  multi_reference: 'From reference comparison',
  test: 'From an A/B test',
};

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={BookOpen} color="from-emerald-500 to-teal-500" title="Knowledge Base"
        description="Everything this project has learned. New strategies are generated with it in mind" />
      <ProjectGate>{(project) => <KnowledgeWorkspace key={project.id} project={project} />}</ProjectGate>
    </div>
  );
}

function KnowledgeWorkspace({ project }: { project: Project }) {
  const entries = useQuery({ queryKey: ['knowledge', project.id], queryFn: () => knowledgeApi.list(project.id) });
  const [category, setCategory] = useState('');
  const [text, setText] = useState('');
  const [validatedOnly, setValidatedOnly] = useState(false);
  const [adding, setAdding] = useState(false);

  const all = entries.data?.entries ?? [];
  const categories = Array.from(new Set([...all.map((e) => e.category), ...DEFAULT_CATEGORIES])).sort();
  const shown = all.filter((e) =>
    (!category || e.category === category) &&
    (!validatedOnly || e.is_validated) &&
    `${e.title} ${JSON.stringify(e.content)} ${e.tags.join(' ')}`.toLowerCase().includes(text.toLowerCase()),
  );

  return (
    <>
      {adding && <NewEntryForm projectId={project.id} categories={categories} onDone={() => setAdding(false)} />}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl">
              Learnings{entries.data && <span className="ml-2 text-base font-normal text-muted-foreground">({entries.data.total})</span>}
            </CardTitle>
            {!adding && <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-2 h-4 w-4" />Add learning</Button>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search…" className="sm:max-w-xs" aria-label="Search learnings" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={validatedOnly} onChange={(e) => setValidatedOnly(e.target.checked)} className="rounded border-input" />
              Validated only
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          <InlineError error={entries.error} />
          {entries.data && shown.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">
              {all.length === 0
                ? 'Nothing learned yet. Learnings are added by Analytics, the Testing Lab and Multi-Reference Intelligence, or by you.'
                : 'No learnings match these filters.'}
            </p>
          )}
          {shown.map((e) => <EntryCard key={e.id} projectId={project.id} entry={e} />)}
        </CardContent>
      </Card>
    </>
  );
}

function NewEntryForm({ projectId, categories, onDone }: { projectId: string; categories: string[]; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('hooks');
  const [insight, setInsight] = useState('');
  const [tags, setTags] = useState('');
  const [confidence, setConfidence] = useState(70);
  const create = useMutation({
    mutationFn: () => knowledgeApi.create(projectId, {
      title: title.trim(),
      category: category.trim().toLowerCase().replace(/\s+/g, '_') || 'general',
      content: { insight: insight.trim() },
      source_type: 'manual',
      confidence_level: confidence / 100,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', projectId] });
      onDone();
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">New learning</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div>
              <label htmlFor="k-title" className="mb-1.5 block text-sm font-medium">Title</label>
              <Input id="k-title" required maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Questions in the first 3 seconds double comments" />
            </div>
            <div>
              <label htmlFor="k-category" className="mb-1.5 block text-sm font-medium">Category</label>
              <Input id="k-category" list="k-categories" value={category} onChange={(e) => setCategory(e.target.value)} />
              <datalist id="k-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div>
            <label htmlFor="k-insight" className="mb-1.5 block text-sm font-medium">What did you learn?</label>
            <Textarea id="k-insight" required value={insight} onChange={(e) => setInsight(e.target.value)} className="min-h-[80px]" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="k-tags" className="mb-1.5 block text-sm font-medium">Tags (comma-separated)</label>
              <Input id="k-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <label className="text-sm font-medium">
              Confidence: {confidence}%
              <input type="range" min={10} max={100} step={5} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))}
                className="mt-3 block w-full" />
            </label>
          </div>
          <InlineError error={create.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || !title.trim() || !insight.trim()}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EntryCard({ projectId, entry: e }: { projectId: string; entry: KnowledgeEntry }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['knowledge', projectId] });
  const toggle = useMutation({ mutationFn: () => knowledgeApi.update(projectId, e.id, { is_validated: !e.is_validated }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => knowledgeApi.remove(projectId, e.id), onSuccess: refresh });
  const insight = typeof e.content?.insight === 'string' ? (e.content.insight as string) : null;

  return (
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer space-y-1">
        <span className="font-semibold">{e.title}</span>
        <span className="ml-2 inline-flex flex-wrap items-center gap-2 align-middle">
          <span className="rounded bg-muted px-2 py-0.5 text-xs">{humanize(e.category)}</span>
          {e.is_validated && <span className="flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"><CheckCircle className="h-3 w-3" />validated</span>}
          <span className="text-xs text-muted-foreground">{SOURCE_LABELS[e.source_type] ?? e.source_type} · {Math.round(e.confidence_level * 100)}% confidence</span>
        </span>
        {insight && <span className="mt-1 block text-sm text-muted-foreground">{insight}</span>}
      </summary>
      <div className="mt-3 space-y-3">
        {!insight && <DataView value={e.content} />}
        {Object.keys(e.evidence ?? {}).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Evidence</p>
            <DataView value={e.evidence} />
          </div>
        )}
        {e.tags.length > 0 && <p className="text-xs text-muted-foreground">Tags: {e.tags.join(', ')}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => toggle.mutate()} disabled={toggle.isPending}>
            <CheckCircle className={cn('mr-2 h-4 w-4', e.is_validated && 'text-green-600')} />
            {e.is_validated ? 'Mark unvalidated' : 'Mark validated'}
          </Button>
          <span className="text-xs text-muted-foreground">Added {new Date(e.created_at).toLocaleDateString()}</span>
          <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" disabled={remove.isPending}
            onClick={() => window.confirm(`Delete "${e.title}"?`) && remove.mutate()}>
            <Trash2 className="mr-2 h-4 w-4" />Delete
          </Button>
        </div>
        <InlineError error={toggle.error ?? remove.error} />
      </div>
    </details>
  );
}
