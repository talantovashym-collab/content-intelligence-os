'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { OpportunityCard } from '@/components/opportunity-card';
import { InlineError, SourceNote } from '@/components/source-note';
import { CREATIVE_FORMATS, humanize, opportunitiesApi, type DiscoveryResult, type Project } from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

export default function DiscoverPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Search} color="from-blue-500 to-cyan-500" title="Discover Opportunities"
        description="Research what already performs on YouTube for your niche and find the gaps worth making" />
      <ProjectGate>{(project) => <DiscoverWorkspace key={project.id} project={project} />}</ProjectGate>
    </div>
  );
}

function DiscoverWorkspace({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const [niche, setNiche] = useState(project.niche ?? '');
  const [audience, setAudience] = useState(project.target_audience ?? '');
  const [formats, setFormats] = useState<string[]>(['EDUCATIONAL']);
  const [count, setCount] = useState(5);
  const [lastRun, setLastRun] = useState<DiscoveryResult | null>(null);

  const opportunities = useQuery({
    queryKey: ['opportunities', project.id, 'discovery'],
    queryFn: () => opportunitiesApi.list(project.id, 'discovery'),
  });

  const discover = useMutation({
    mutationFn: () =>
      opportunitiesApi.discover(project.id, {
        niche: niche.trim() || undefined,
        audience: audience.trim() || undefined,
        platforms: ['youtube'],
        content_types: formats.map((f) => f.toLowerCase()),
        max_results: count,
      }),
    onSuccess: (result) => {
      setLastRun(result);
      queryClient.invalidateQueries({ queryKey: ['opportunities', project.id] });
    },
  });

  const toggle = (f: string) => setFormats((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Run discovery</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); discover.mutate(); }}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="niche" className="mb-1.5 block text-sm font-medium">Niche or topic</label>
                <Input id="niche" required minLength={2} value={niche} onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g., budgeting for students" />
              </div>
              <div>
                <label htmlFor="audience" className="mb-1.5 block text-sm font-medium">Target audience</label>
                <Input id="audience" value={audience} onChange={(e) => setAudience(e.target.value)}
                  placeholder="Who are the videos for?" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <fieldset>
                <legend className="mb-1.5 block text-sm font-medium">Preferred formats</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {CREATIVE_FORMATS.map((f) => (
                    <label key={f} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formats.includes(f)} onChange={() => toggle(f)} className="rounded border-input" />
                      {humanize(f)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="text-sm font-medium">
                Opportunities
                <select value={count} onChange={(e) => setCount(Number(e.target.value))}
                  className="mt-1.5 block h-10 w-28 rounded-md border border-input bg-background px-3 text-sm">
                  {[3, 5, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
            <InlineError error={discover.error} />
            <Button type="submit" size="lg" className="w-full" disabled={discover.isPending}>
              {discover.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              {discover.isPending ? 'Searching YouTube and analysing… this can take a minute' : 'Discover opportunities'}
            </Button>
            {lastRun && (
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                Found {lastRun.opportunities.length} opportunities from {lastRun.videos_analyzed} real videos
                {lastRun.provider ? ` using ${lastRun.provider}` : ''}.
                <div className="mt-1.5">
                  <SourceNote source={lastRun.used_ai ? 'ai' : 'template'} warnings={lastRun.warnings} />
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Discovered opportunities
            {opportunities.data && <span className="ml-2 text-base font-normal text-muted-foreground">({opportunities.data.total})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {opportunities.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          <InlineError error={opportunities.error} />
          {opportunities.data?.opportunities.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">Nothing yet. Run a discovery above.</p>
          )}
          {[...(opportunities.data?.opportunities ?? [])]
            .sort((a, b) => (b.rank_scores?.overall_score ?? 0) - (a.rank_scores?.overall_score ?? 0))
            .map((o) => <OpportunityCard key={o.id} projectId={project.id} opportunity={o} />)}
        </CardContent>
      </Card>
    </>
  );
}
