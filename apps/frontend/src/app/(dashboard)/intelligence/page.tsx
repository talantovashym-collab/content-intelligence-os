'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Target, Trash2, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataView } from '@/components/data-view';
import { PageHeader } from '@/components/layout/page-header';
import { InlineError, SourceNote } from '@/components/source-note';
import { compactNumber, knowledgeApi, referencesApi, type KnowledgeEntry, type Project } from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

export default function IntelligencePage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Target} color="from-rose-500 to-red-500" title="Multi-Reference Intelligence"
        description="Compare several reference videos to extract the creative DNA behind what performs" />
      <ProjectGate>{(project) => <IntelligenceWorkspace key={project.id} project={project} />}</ProjectGate>
    </div>
  );
}

function IntelligenceWorkspace({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const references = useQuery({ queryKey: ['references', project.id], queryFn: () => referencesApi.list(project.id) });
  const entries = useQuery({
    queryKey: ['knowledge', project.id, 'creative_dna'],
    queryFn: () => knowledgeApi.list(project.id, 'creative_dna'),
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('');

  const analyze = useMutation({
    mutationFn: () => knowledgeApi.analyzeReferences(project.id, selected, title.trim()),
    onSuccess: () => {
      setSelected([]);
      setTitle('');
      queryClient.invalidateQueries({ queryKey: ['knowledge', project.id] });
    },
  });
  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 10 ? [...cur, id] : cur));

  const refs = references.data?.references ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Compare references</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {references.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {!references.isLoading && refs.length < 2 && (
            <p className="text-sm text-muted-foreground">
              You need at least two videos in your library. <Link href="/research" className="text-primary underline">Find references</Link>
            </p>
          )}
          {refs.length >= 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Pick 2–10 videos. Investigated videos give much richer results.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {refs.map((r) => (
                  <label key={r.id} className="flex items-start gap-2 rounded-md border p-2 text-sm hover:bg-muted/40">
                    <input type="checkbox" className="mt-0.5 rounded border-input" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                    <span className="min-w-0">
                      <span className="line-clamp-1 font-medium">{r.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {compactNumber(r.engagement_metrics?.views)} views · {r.status === 'ANALYZED' ? 'investigated' : 'not investigated'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div>
                <label htmlFor="dna-title" className="mb-1.5 block text-sm font-medium">Name (optional)</label>
                <Input id="dna-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., What top budgeting channels do" />
              </div>
              <InlineError error={analyze.error} />
              <Button size="lg" className="w-full" onClick={() => analyze.mutate()} disabled={analyze.isPending || selected.length < 2}>
                {analyze.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {analyze.isPending ? 'Comparing…' : `Extract creative DNA from ${selected.length} videos`}
              </Button>
              {analyze.data && <SourceNote source={analyze.data.source} warnings={[analyze.data.warning]} />}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Creative DNA</CardTitle>
          <p className="text-sm text-muted-foreground">
            Saved to your Knowledge Base. New creative strategies in this project take these insights into account.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          <InlineError error={entries.error} />
          {entries.data?.entries.length === 0 && <p className="py-6 text-center text-muted-foreground">No comparisons yet.</p>}
          {entries.data?.entries.map((e) => <DnaEntry key={e.id} projectId={project.id} entry={e} />)}
        </CardContent>
      </Card>
    </>
  );
}

function DnaEntry({ projectId, entry }: { projectId: string; entry: KnowledgeEntry }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => knowledgeApi.remove(projectId, entry.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledge', projectId] }),
  });
  const titles = (entry.evidence as { titles?: string[] }).titles ?? [];
  return (
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer">
        <span className="font-semibold">{entry.title}</span>
        <span className="ml-2 text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
      </summary>
      <div className="mt-3 space-y-3">
        {titles.length > 0 && <p className="text-xs text-muted-foreground">From: {titles.join(' · ')}</p>}
        <DataView value={entry.content} />
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" disabled={remove.isPending}
            onClick={() => window.confirm('Delete this creative DNA entry?') && remove.mutate()}>
            <Trash2 className="mr-2 h-4 w-4" />Delete
          </Button>
        </div>
        <InlineError error={remove.error} />
      </div>
    </details>
  );
}
