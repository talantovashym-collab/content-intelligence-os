'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Brain, Loader2, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataView } from '@/components/data-view';
import { PageHeader } from '@/components/layout/page-header';
import { InlineError, SourceNote } from '@/components/source-note';
import { MediaPlayer, type PlayerHandle } from '@/components/media/media-player';
import { compactNumber, humanize, investigationsApi, referencesApi, type Investigation, type Project, type Reference } from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

const DEFAULT_TYPES = ['HOOKS', 'NARRATIVE_STRUCTURE', 'PACING', 'CTAS'];

export default function InvestigationPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Brain} color="from-pink-500 to-rose-500" title="Investigation Studio"
        description="Reverse-engineer why a reference video works: hooks, structure, pacing, persuasion" />
      <ProjectGate>
        {(project) => (
          <Suspense>
            <InvestigationWorkspace key={project.id} project={project} />
          </Suspense>
        )}
      </ProjectGate>
    </div>
  );
}

/** "1:05" -> 65 */
function toSeconds(ts?: string): number | null {
  if (!ts) return null;
  const parts = ts.split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

/** Jump the page's player to a moment; scrolls it into view first. */
type Seek = (seconds: number) => void;

function InvestigationWorkspace({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const references = useQuery({ queryKey: ['references', project.id], queryFn: () => referencesApi.list(project.id) });
  const types = useQuery({ queryKey: ['investigation-types', project.id], queryFn: () => investigationsApi.types(project.id), staleTime: Infinity });
  const [referenceId, setReferenceId] = useState('');
  const [selected, setSelected] = useState<string[]>(DEFAULT_TYPES);

  useEffect(() => {
    const refs = references.data?.references ?? [];
    if (referenceId || refs.length === 0) return;
    const wanted = searchParams.get('reference');
    setReferenceId(refs.find((r) => r.id === wanted)?.id ?? refs[0].id);
  }, [references.data, referenceId, searchParams]);

  const reference = references.data?.references.find((r) => r.id === referenceId);
  const investigations = useQuery({
    queryKey: ['investigations', project.id, referenceId],
    queryFn: () => investigationsApi.list(project.id, referenceId),
    enabled: !!referenceId,
  });
  const run = useMutation({
    mutationFn: () => investigationsApi.run(project.id, referenceId, selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigations', project.id] });
      queryClient.invalidateQueries({ queryKey: ['references', project.id] });
    },
  });
  const toggle = (t: string) => setSelected((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const player = useRef<PlayerHandle>(null);
  const playerBox = useRef<HTMLDivElement>(null);
  const seek: Seek = (seconds) => {
    playerBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    player.current?.seek(seconds);
  };
  const playable = Boolean(reference && (reference.playback_url || reference.source_url));

  if (references.isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (!references.data?.references.length) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="font-medium">Your reference library is empty</p>
        <Link href="/research" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          Find videos in Reference Research
        </Link>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Run an investigation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="reference" className="mb-1.5 block text-sm font-medium">Reference video</label>
            <select id="reference" value={referenceId} onChange={(e) => { setReferenceId(e.target.value); run.reset(); }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {references.data.references.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.playback_url ? 'uploaded' : `${compactNumber(r.engagement_metrics?.views)} views`})
                </option>
              ))}
            </select>
            {reference && !reference.reference_metadata?.transcript && (
              <p className="mt-1.5 text-xs text-amber-700">
                {reference.status === 'INDEXING'
                  ? 'This upload is still being transcribed; wait for it to finish for timestamped findings.'
                  : 'This video has no transcript, so analyses rely on its title, description and stats only.'}
              </p>
            )}
          </div>
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium">Analyses</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {types.data?.map((t) => (
                <label key={t.type} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 rounded border-input" checked={selected.includes(t.type)} onChange={() => toggle(t.type)} />
                  <span><span className="font-medium">{humanize(t.type)}</span><span className="block text-xs text-muted-foreground">{t.description}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <InlineError error={run.error} />
          <Button size="lg" className="w-full" onClick={() => run.mutate()} disabled={run.isPending || !referenceId || selected.length === 0}>
            {run.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            {run.isPending ? 'Analysing…' : `Run ${selected.length} ${selected.length === 1 ? 'analysis' : 'analyses'}`}
          </Button>
          {run.data && <SourceNote source={run.data.source} warnings={[run.data.warning]} />}
        </CardContent>
      </Card>

      {reference && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Findings for “{reference.title}”</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {playable && (
              <div ref={playerBox} className="mx-auto w-full max-w-3xl scroll-mt-24">
                <MediaPlayer ref={player} key={reference.id} source={{ ...reference, video_id: reference.reference_metadata?.video_id }} />
                <p className="mt-1.5 text-center text-xs text-muted-foreground">Click any timestamp below to jump the player there.</p>
              </div>
            )}
            {investigations.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {investigations.data?.investigations.length === 0 && (
              <p className="py-6 text-center text-muted-foreground">No analyses yet for this video.</p>
            )}
            {investigations.data?.investigations.map((i) => <InvestigationCard key={i.id} investigation={i} onSeek={playable ? seek : undefined} />)}
            <Transcript reference={reference} onSeek={playable ? seek : undefined} />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function InvestigationCard({ investigation: i, onSeek }: { investigation: Investigation; onSeek?: Seek }) {
  const evidence = i.evidence?.items ?? [];
  const applications = i.creative_applications?.items ?? [];
  return (
    <details className="rounded-lg border p-3" open>
      <summary className="flex cursor-pointer flex-wrap items-center gap-2">
        <span className="font-semibold">{humanize(i.analysis_type)}</span>
        <span className="text-xs text-muted-foreground">confidence {Math.round(i.confidence_level * 100)}%</span>
        {i.interpretations?.source === 'template' && <span className="rounded bg-muted px-2 py-0.5 text-xs">measured only</span>}
      </summary>
      <div className="mt-3 space-y-3">
        {i.interpretations?.text && <p className="text-sm">{i.interpretations.text}</p>}
        <DataView value={i.findings} />
        {evidence.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Evidence</p>
            <ul className="mt-1 space-y-1 text-sm">
              {evidence.map((e, n) => {
                const at = toSeconds(e.timestamp);
                return (
                  <li key={n} className="flex gap-2">
                    {onSeek && at !== null ? (
                      <button type="button" onClick={() => onSeek(at)} title="Play from here"
                        className="shrink-0 font-mono text-xs text-primary hover:underline">{e.timestamp}</button>
                    ) : (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{e.timestamp ?? '–'}</span>
                    )}
                    <span>“{e.quote}”</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {applications.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Use it in your own video</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{applications.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        )}
      </div>
    </details>
  );
}

function Transcript({ reference, onSeek }: { reference: Reference; onSeek?: Seek }) {
  const segments = reference.reference_metadata?.transcript?.segments ?? [];
  if (!segments.length) return null;
  return (
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-semibold">Transcript ({segments.length} lines)</summary>
      <div className="mt-2 max-h-80 space-y-0.5 overflow-y-auto text-sm">
        {segments.map((s, n) => (
          <p key={n}>
            {onSeek ? (
              <button type="button" onClick={() => onSeek(s.start)} title="Play from here"
                className="mr-2 font-mono text-xs text-primary hover:underline">{clock(s.start)}</button>
            ) : (
              <span className="mr-2 font-mono text-xs text-muted-foreground">{clock(s.start)}</span>
            )}
            {s.text}
          </p>
        ))}
      </div>
    </details>
  );
}
