'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Globe, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/page-header';
import { InlineError, SourceNote } from '@/components/source-note';
import { cn } from '@/lib/utils';
import {
  PLATFORMS, PLATFORM_LABELS, PUBLISH_STATUSES, humanize, productionsApi, publicationsApi, strategiesApi,
  type Platform, type Production, type Project, type Publication, type PublishStatus,
} from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-muted text-foreground',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  PUBLISHING: 'bg-yellow-100 text-yellow-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

export default function PublishingPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Globe} color="from-lime-500 to-green-500" title="Publishing Center"
        description="Write platform-optimised copy, plan when each video goes out, and track where it went live" />
      <ProjectGate>{(project) => <PublishingWorkspace key={project.id} project={project} />}</ProjectGate>
    </div>
  );
}

function PublishingWorkspace({ project }: { project: Project }) {
  const strategies = useQuery({ queryKey: ['strategies', project.id], queryFn: () => strategiesApi.list(project.id) });
  const productions = useQuery({ queryKey: ['productions', project.id], queryFn: () => productionsApi.list(project.id) });
  const publications = useQuery({ queryKey: ['publications', project.id], queryFn: () => publicationsApi.list(project.id) });
  const topics = new Map(strategies.data?.strategies.map((s) => [s.strategy_id, s.topic]));
  const label = (p: Production) => `${topics.get(p.strategy_id) ?? 'Production'} · ${humanize(p.format)} v${p.version}`;

  return (
    <>
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Posting straight to YouTube or TikTok needs each platform&apos;s app credentials, which aren&apos;t set up yet. Publish the
        video yourself, then paste its link here to track its performance in Analytics.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">New publication</CardTitle>
        </CardHeader>
        <CardContent>
          {productions.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {productions.data?.productions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You need a production first. <Link href="/production" className="text-primary underline">Go to Production Studio</Link>
            </p>
          )}
          {!!productions.data?.productions.length && (
            <PublicationForm project={project} productions={productions.data.productions} label={label} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Publications{publications.data && <span className="ml-2 text-base font-normal text-muted-foreground">({publications.data.total})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {publications.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          <InlineError error={publications.error} />
          {publications.data?.publications.length === 0 && <p className="py-6 text-center text-muted-foreground">Nothing planned yet.</p>}
          {publications.data?.publications.map((p) => <PublicationCard key={p.id} projectId={project.id} publication={p} />)}
        </CardContent>
      </Card>
    </>
  );
}

function PublicationForm({ project, productions, label }: { project: Project; productions: Production[]; label: (p: Production) => string }) {
  const queryClient = useQueryClient();
  const [productionId, setProductionId] = useState(productions[0].id);
  const [platform, setPlatform] = useState<Platform>(project.platforms[0] ?? 'YOUTUBE');
  const [account, setAccount] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const draft = useMutation({
    mutationFn: () => publicationsApi.draft(project.id, productionId, platform),
    onSuccess: (d) => {
      setTitle(d.title);
      setDescription(d.description);
      setTags(d.tags.join(', '));
      setHashtags(d.hashtags.join(' '));
    },
  });
  useEffect(() => draft.reset(), [productionId, platform]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useMutation({
    mutationFn: async () => {
      const pub = await publicationsApi.create(project.id, {
        production_id: productionId,
        platform,
        account_id: account.trim() || 'default',
        title: title.trim(),
        description: description.trim(),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        hashtags: hashtags.split(/\s+/).map((h) => h.trim()).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`)),
        video_url: videoUrl.trim() || 'not uploaded yet',
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      return scheduledAt ? publicationsApi.update(project.id, pub.id, { status: 'SCHEDULED' }) : pub;
    },
    onSuccess: () => {
      setTitle(''); setDescription(''); setTags(''); setHashtags(''); setScheduledAt(''); setVideoUrl('');
      draft.reset();
      queryClient.invalidateQueries({ queryKey: ['publications', project.id] });
    },
  });

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium md:col-span-2">
          Production
          <select value={productionId} onChange={(e) => setProductionId(e.target.value)}
            className="mt-1.5 block h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {productions.map((p) => <option key={p.id} value={p.id}>{label(p)}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          Platform
          <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}
            className="mt-1.5 block h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => draft.mutate()} disabled={draft.isPending}>
          {draft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Draft copy for {PLATFORM_LABELS[platform]}
        </Button>
        {draft.data && <SourceNote source={draft.data.source} warnings={[draft.data.warning]} />}
      </div>
      {draft.data && (draft.data.best_posting_time || draft.data.thumbnail_text) && (
        <p className="text-sm text-muted-foreground">
          {draft.data.best_posting_time && <>Best time to post: {draft.data.best_posting_time}. </>}
          {draft.data.thumbnail_text && <>Thumbnail text: “{draft.data.thumbnail_text}”</>}
        </p>
      )}
      <InlineError error={draft.error} />
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="pub-title" className="mb-1.5 block text-sm font-medium">Title</label>
          <Input id="pub-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pub-account" className="mb-1.5 block text-sm font-medium">Channel / account</label>
          <Input id="pub-account" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="e.g., @mychannel" />
        </div>
      </div>
      <div>
        <label htmlFor="pub-description" className="mb-1.5 block text-sm font-medium">Description / caption</label>
        <Textarea id="pub-description" required value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[100px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="pub-tags" className="mb-1.5 block text-sm font-medium">Tags (comma-separated)</label>
          <Input id="pub-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pub-hashtags" className="mb-1.5 block text-sm font-medium">Hashtags</label>
          <Input id="pub-hashtags" value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#budgeting #students" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="pub-video" className="mb-1.5 block text-sm font-medium">Video file or link (optional)</label>
          <Input id="pub-video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Where the rendered video is" />
        </div>
        <div>
          <label htmlFor="pub-when" className="mb-1.5 block text-sm font-medium">Planned for (optional)</label>
          <Input id="pub-when" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
      </div>
      <InlineError error={create.error} />
      <Button type="submit" disabled={create.isPending || !title.trim() || !description.trim()}>
        {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {scheduledAt ? 'Schedule' : 'Save as draft'}
      </Button>
    </form>
  );
}

function PublicationCard({ projectId, publication: p }: { projectId: string; publication: Publication }) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState(p.platform_url ?? '');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['publications', projectId] });
  const update = useMutation({
    mutationFn: (data: Partial<Publication>) => publicationsApi.update(projectId, p.id, data),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: () => publicationsApi.remove(projectId, p.id), onSuccess: refresh });

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{p.title}</h3>
        <span className="rounded bg-muted px-2 py-0.5 text-xs">{PLATFORM_LABELS[p.platform]}</span>
        <span className={cn('rounded px-2 py-0.5 text-xs', STATUS_STYLE[p.status])}>{humanize(p.status)}</span>
        {p.scheduled_at && <span className="text-xs text-muted-foreground">planned {new Date(p.scheduled_at).toLocaleString()}</span>}
      </div>
      <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{p.description}</p>
      {(p.hashtags.length > 0 || p.tags.length > 0) && (
        <p className="text-xs text-muted-foreground">{[...p.hashtags, ...p.tags].join(' · ')}</p>
      )}
      <form className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({ platform_url: url.trim(), status: 'PUBLISHED', published_at: p.published_at ?? new Date().toISOString() });
        }}>
        <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link to the live video" aria-label="Published URL" />
        <Button type="submit" variant="outline" disabled={update.isPending || !url.trim() || url.trim() === p.platform_url}>
          Mark as published
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          Status
          <select value={p.status} disabled={update.isPending}
            onChange={(e) => update.mutate({ status: e.target.value as PublishStatus })}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm">
            {PUBLISH_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
          </select>
        </label>
        {p.platform_url && (
          <Button size="sm" variant="ghost" asChild>
            <Link href="/analytics"><BarChart className="mr-2 h-4 w-4" />Track performance</Link>
          </Button>
        )}
        <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" disabled={remove.isPending}
          onClick={() => window.confirm(`Delete "${p.title}"? Its analytics are deleted too.`) && remove.mutate()}>
          <Trash2 className="mr-2 h-4 w-4" />Delete
        </Button>
      </div>
      <InlineError error={update.error ?? remove.error} />
    </div>
  );
}
