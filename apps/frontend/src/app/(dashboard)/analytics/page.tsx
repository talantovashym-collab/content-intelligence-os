'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, ExternalLink, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { InlineError, SourceNote } from '@/components/source-note';
import { cn } from '@/lib/utils';
import {
  PLATFORM_LABELS, analyticsApi, compactNumber, publicationsApi, type Analytics, type Project, type Publication, type Source,
} from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={BarChart} color="from-green-500 to-emerald-500" title="Performance Analytics"
        description="Real stats for your published videos, and what they teach you for the next one" />
      <ProjectGate>{(project) => <AnalyticsWorkspace key={project.id} project={project} />}</ProjectGate>
    </div>
  );
}

function AnalyticsWorkspace({ project }: { project: Project }) {
  const publications = useQuery({ queryKey: ['publications', project.id], queryFn: () => publicationsApi.list(project.id) });
  const analytics = useQuery({ queryKey: ['analytics', project.id], queryFn: () => analyticsApi.list(project.id) });

  const latest = new Map<string, Analytics>();
  for (const a of analytics.data?.analytics ?? []) {
    const cur = latest.get(a.publication_id);
    if (!cur || a.collected_at > cur.collected_at) latest.set(a.publication_id, a);
  }
  const live = (publications.data?.publications ?? []).filter((p) => p.platform_url);
  const waiting = (publications.data?.publications ?? []).filter((p) => !p.platform_url);
  const rows = live.map((p) => latest.get(p.id)).filter(Boolean) as Analytics[];
  const totalViews = rows.reduce((n, a) => n + (a.views || 0), 0);
  const avgEngagement = rows.length ? rows.reduce((n, a) => n + (a.engagement_rate || 0), 0) / rows.length : null;

  if (publications.isLoading || analytics.isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat title="Live videos" value={String(live.length)} />
        <Stat title="Total views" value={compactNumber(totalViews)} />
        <Stat title="Avg. engagement" value={avgEngagement === null ? '–' : `${(avgEngagement * 100).toFixed(1)}%`} />
      </div>
      <InlineError error={publications.error ?? analytics.error} />

      {live.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">No published videos to track yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Mark a publication as published with its link and its stats show up here.</p>
          <Link href="/publishing" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">Go to Publishing Center</Link>
        </div>
      )}
      {live.map((p) => <PublicationStats key={p.id} projectId={project.id} publication={p} analytics={latest.get(p.id)} />)}

      {waiting.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {waiting.length} publication{waiting.length > 1 ? 's have' : ' has'} no live link yet:{' '}
          {waiting.map((p) => p.title).join(', ')}. <Link href="/publishing" className="underline">Add links</Link>
        </p>
      )}
    </>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
    </Card>
  );
}

const MANUAL_FIELDS: { key: keyof Analytics; label: string; percent?: boolean }[] = [
  { key: 'watch_time', label: 'Watch time (s)' },
  { key: 'completion_rate', label: 'Completion rate (%)', percent: true },
  { key: 'shares', label: 'Shares' },
  { key: 'saves', label: 'Saves' },
  { key: 'follower_growth', label: 'New followers' },
];

function PublicationStats({ projectId, publication: p, analytics: a }: { projectId: string; publication: Publication; analytics?: Analytics }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['analytics', projectId] });
  const [manual, setManual] = useState<Record<string, string>>({});
  const [insightSource, setInsightSource] = useState<{ source: Source; warning?: string | null; saved: number } | null>(null);

  const fetchStats = useMutation({ mutationFn: () => analyticsApi.fetch(projectId, p.id), onSuccess: refresh });
  const saveManual = useMutation({
    mutationFn: () => {
      const data: Partial<Analytics> = {};
      for (const f of MANUAL_FIELDS) {
        const raw = manual[f.key];
        if (raw === undefined || raw === '') continue;
        const n = Number(raw);
        if (!Number.isFinite(n)) continue;
        (data as Record<string, number>)[f.key] = f.percent ? n / 100 : Math.round(n);
      }
      return analyticsApi.update(projectId, a!.id, data);
    },
    onSuccess: () => { setManual({}); refresh(); },
  });
  const insights = useMutation({
    mutationFn: () => analyticsApi.insights(projectId, a!.id),
    onSuccess: (r) => {
      setInsightSource({ source: r.source, warning: r.warning, saved: r.learnings_saved });
      refresh();
      queryClient.invalidateQueries({ queryKey: ['knowledge', projectId] });
    },
  });

  const snapshots = a?.performance_over_time?.snapshots ?? [];
  const maxViews = Math.max(1, ...snapshots.map((s) => s.views ?? 0));
  const groups = [
    { title: 'What worked', items: a?.successful_elements?.items ?? [], tone: 'text-green-700' },
    { title: 'Weak points', items: a?.weak_points?.items ?? [], tone: 'text-red-700' },
    { title: 'Next time', items: a?.improvement_opps?.items ?? [], tone: '' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-lg">{p.title}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {PLATFORM_LABELS[p.platform]}
            {a && ` · updated ${new Date(a.collected_at).toLocaleString()}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={() => fetchStats.mutate()} disabled={fetchStats.isPending}>
            <RefreshCw className={cn('mr-2 h-4 w-4', fetchStats.isPending && 'animate-spin')} />{a ? 'Update stats' : 'Fetch stats'}
          </Button>
          {p.platform_url && (
            <Button size="sm" variant="ghost" asChild>
              <a href={p.platform_url} target="_blank" rel="noreferrer" aria-label="Open video"><ExternalLink className="h-4 w-4" /></a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <InlineError error={fetchStats.error} />
        {!a && !fetchStats.isPending && <p className="text-sm text-muted-foreground">No stats yet. Fetch them from the live video.</p>}
        {a && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Views', compactNumber(a.views)],
                ['Likes', compactNumber(a.likes)],
                ['Comments', compactNumber(a.comments)],
                ['Engagement', `${((a.engagement_rate || 0) * 100).toFixed(2)}%`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="text-xl font-semibold">{v}</div>
                </div>
              ))}
            </div>

            {snapshots.length > 1 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Views over time ({snapshots.length} checks)</p>
                <div className="flex h-16 items-end gap-1">
                  {snapshots.slice(-30).map((s) => (
                    <div key={s.at} title={`${new Date(s.at).toLocaleString()}: ${s.views} views`}
                      className="flex-1 rounded-t bg-primary/70" style={{ height: `${Math.max(4, ((s.views ?? 0) / maxViews) * 100)}%` }} />
                  ))}
                </div>
              </div>
            )}

            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">Add stats only you can see (from YouTube Studio, TikTok analytics…)</summary>
              <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); saveManual.mutate(); }}>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {MANUAL_FIELDS.map((f) => {
                    const current = a[f.key] as number;
                    return (
                      <label key={f.key} className="text-xs font-medium">
                        {f.label}
                        <Input type="number" min={0} step="any" className="mt-1"
                          placeholder={String(f.percent ? Math.round((current || 0) * 1000) / 10 : current || 0)}
                          value={manual[f.key] ?? ''} onChange={(e) => setManual((m) => ({ ...m, [f.key]: e.target.value }))} />
                      </label>
                    );
                  })}
                </div>
                <InlineError error={saveManual.error} />
                <Button type="submit" size="sm" variant="outline" disabled={saveManual.isPending || Object.values(manual).every((v) => v === '')}>
                  Save
                </Button>
              </form>
            </details>

            <div className="space-y-3 border-t pt-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" onClick={() => insights.mutate()} disabled={insights.isPending}>
                  {insights.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Analyse performance
                </Button>
                {insightSource && (
                  <span className="text-xs text-muted-foreground">
                    {insightSource.saved > 0 && (
                      <>{insightSource.saved} learning{insightSource.saved > 1 ? 's' : ''} saved to the <Link href="/knowledge" className="underline">Knowledge Base</Link>. </>
                    )}
                  </span>
                )}
              </div>
              {insightSource && <SourceNote source={insightSource.source} warnings={[insightSource.warning]} />}
              <InlineError error={insights.error} />
              {groups.some((g) => g.items.length) && (
                <div className="grid gap-4 md:grid-cols-3">
                  {groups.map((g) => g.items.length > 0 && (
                    <div key={g.title}>
                      <p className={cn('text-xs font-semibold', g.tone)}>{g.title}</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{g.items.map((i) => <li key={i}>{i}</li>)}</ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
