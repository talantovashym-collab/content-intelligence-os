'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InlineError } from '@/components/source-note';
import { cn } from '@/lib/utils';
import { compactNumber, humanize, opportunitiesApi, type Opportunity, type VideoSummary } from '@/lib/api';

const STATUSES: Opportunity['status'][] = ['DISCOVERED', 'RESEARCHING', 'VALIDATED', 'REJECTED', 'ARCHIVED'];
const STATUS_STYLE: Record<string, string> = {
  DISCOVERED: 'bg-blue-100 text-blue-800',
  RESEARCHING: 'bg-yellow-100 text-yellow-800',
  VALIDATED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  ARCHIVED: 'bg-muted text-muted-foreground',
};
const VERDICT_STYLE: Record<string, string> = {
  strong: 'bg-green-100 text-green-800',
  promising: 'bg-blue-100 text-blue-800',
  crowded: 'bg-orange-100 text-orange-800',
  weak: 'bg-red-100 text-red-800',
};
const SCORE_LABELS: Record<string, string> = {
  market_interest: 'Market interest',
  trend_momentum: 'Trend momentum',
  audience_relevance: 'Audience relevance',
  content_saturation: 'Saturation (lower is better)',
  creative_potential: 'Creative potential',
  production_feasibility: 'Feasibility',
};

function list(value: unknown, key: string): string[] {
  const v = (value as Record<string, unknown> | null)?.[key];
  return Array.isArray(v) ? v.map(String) : [];
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}

export function VideoLink({ video }: { video: VideoSummary }) {
  return (
    <a href={video.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-md border p-2 text-sm hover:bg-muted/40">
      {video.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.thumbnail_url} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 font-medium">{video.title}</span>
        <span className="text-xs text-muted-foreground">
          {video.creator} · {compactNumber(video.views)} views
        </span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </a>
  );
}

export function OpportunityCard({ projectId, opportunity: o }: { projectId: string; opportunity: Opportunity }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['opportunities', projectId] });
  const setStatus = useMutation({
    mutationFn: (status: Opportunity['status']) => opportunitiesApi.setStatus(projectId, o.id, status),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: () => opportunitiesApi.remove(projectId, o.id), onSuccess: refresh });

  const evidence = o.market_evidence as { summary?: string; verdict?: string; source?: string; market?: { median_views?: number; videos_found?: number } };
  const refs = ((o.reference_videos as { videos?: VideoSummary[] }).videos ?? []);
  const creators = ((o.relevant_creators as { creators?: { name: string; videos: number; total_views: number }[] }).creators ?? []);
  const score = o.rank_scores?.overall_score;

  return (
    <div className="rounded-lg border">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 p-4 text-left hover:bg-muted/40">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{o.title}</h3>
            <span className={cn('rounded px-2 py-0.5 text-xs', STATUS_STYLE[o.status])}>{humanize(o.status)}</span>
            {evidence.verdict && (
              <span className={cn('rounded px-2 py-0.5 text-xs capitalize', VERDICT_STYLE[evidence.verdict] ?? 'bg-muted')}>
                {evidence.verdict}
              </span>
            )}
            {evidence.source === 'template' && <span className="rounded bg-muted px-2 py-0.5 text-xs">template</span>}
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{o.topic_description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {score !== undefined && (
            <div className="text-right">
              <div className="text-lg font-bold">{Math.round(score * 100)}</div>
              <div className="text-[10px] uppercase text-muted-foreground">score</div>
            </div>
          )}
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Audience</p>
                <p className="text-sm">{o.target_audience}</p>
              </div>
              {o.audience_need && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Audience need</p>
                  <p className="text-sm">{o.audience_need}</p>
                </div>
              )}
              {evidence.summary && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Market evidence</p>
                  <p className="text-sm">{evidence.summary}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {evidence.market?.videos_found ?? 0} videos analysed · median {compactNumber(evidence.market?.median_views)} views ·
                confidence {Math.round(o.confidence_level * 100)}% · formats {o.creative_formats.map(humanize).join(', ')}
              </p>
            </div>
            <div className="space-y-1.5">
              {Object.entries(SCORE_LABELS).map(([k, label]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((o.rank_scores?.[k] ?? 0) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-right">{Math.round((o.rank_scores?.[k] ?? 0) * 100)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Bullets title="Hooks" items={list(o.potential_hooks, 'hooks')} />
            <Bullets title="Gaps in existing content" items={list(o.competing_content, 'gaps')} />
            <Bullets title="Better angles" items={list(o.relevant_trends, 'better_angles')} />
            <Bullets title="Trend signals" items={list(o.relevant_trends, 'signals')} />
            <Bullets title="Risks" items={list(o.risks, 'risks')} />
            <Bullets title="Recommended actions" items={list(o.recommended_actions, 'actions')} />
          </div>

          {refs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Reference videos</p>
              <div className="grid gap-2 md:grid-cols-2">{refs.map((v) => <VideoLink key={v.url} video={v} />)}</div>
            </div>
          )}
          {creators.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Top creators: {creators.map((c) => `${c.name} (${compactNumber(c.total_views)})`).join(' · ')}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <label className="flex items-center gap-2 text-sm">
              Status
              <select
                value={o.status}
                disabled={setStatus.isPending}
                onChange={(e) => setStatus.mutate(e.target.value as Opportunity['status'])}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
              </select>
            </label>
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/strategy?opportunity=${o.id}`}>
                Create strategy <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive"
              disabled={remove.isPending}
              onClick={() => window.confirm(`Delete "${o.title}"?`) && remove.mutate()}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
          <InlineError error={setStatus.error ?? remove.error} />
        </div>
      )}
    </div>
  );
}
