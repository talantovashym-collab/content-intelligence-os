'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle, ExternalLink, KeyRound, Loader2, Lock, Trash2, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineError } from '@/components/source-note';
import { cn } from '@/lib/utils';
import { systemApi, type AIStatus, type AITestResult, type SavedAIKey } from '@/lib/api';

const AI_KEY = ['system', 'ai'] as const;
type TestState = { ok: true; result: AITestResult } | { ok: false; error: string } | { pending: true };

/**
 * The signed-in user's own AI provider keys: add, test, order, replace, remove.
 * Keys are write-only from here: the server keeps them encrypted and returns only a hint.
 */
export function AiKeysCard() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: AI_KEY, queryFn: systemApi.ai });
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const s = status.data;
  const setStatus = (next: AIStatus) => queryClient.setQueryData(AI_KEY, next);

  const runTest = async (provider: string) => {
    setTests((t) => ({ ...t, [provider]: { pending: true } }));
    try {
      const result = await systemApi.testAi(provider);
      setTests((t) => ({ ...t, [provider]: { ok: true, result } }));
    } catch (e) {
      setTests((t) => ({ ...t, [provider]: { ok: false, error: (e as Error).message } }));
    } finally {
      queryClient.invalidateQueries({ queryKey: AI_KEY });
    }
  };

  const reorder = useMutation({ mutationFn: systemApi.reorderKeys, onSuccess: setStatus });
  const remove = useMutation({
    mutationFn: systemApi.removeKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AI_KEY }),
  });

  const move = (keys: SavedAIKey[], index: number, by: -1 | 1) => {
    const order = keys.map((k) => k.provider);
    const [item] = order.splice(index, 1);
    order.splice(index + by, 0, item);
    reorder.mutate(order);
  };

  return (
    <Card id="ai-keys" className="scroll-mt-24">
      <CardHeader className="space-y-1.5">
        <CardTitle className="flex items-center gap-2 text-xl"><KeyRound className="h-5 w-5" /> Your AI keys</CardTitle>
        <p className="text-sm text-muted-foreground">
          Every account uses its own provider keys, so AI usage is billed to your provider account, not shared.
          Keys are encrypted on the server and never shown again; only the last four characters are.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {status.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        <InlineError error={status.error} />

        {s && s.keys.length === 0 && (
          <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-medium">Add a key to turn on AI analysis.</span> Until then every module still works,
              but produces template output built from the real data instead of AI analysis.
            </p>
          </div>
        )}

        {s && s.keys.length > 0 && (
          <ol className="divide-y rounded-lg border">
            {s.keys.map((k, i) => {
              const info = s.providers.find((p) => p.name === k.provider);
              const test = tests[k.provider];
              return (
                <li key={k.provider} className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium',
                      i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                      {i === 0 ? 'Primary' : `Fallback ${i}`}
                    </span>
                    <span className="font-medium">{k.label}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{k.key_hint ?? '…'}</code>
                    {info?.cooling_down && <span className="text-xs text-amber-700">failed recently, tried last for a few minutes</span>}
                    <div className="ml-auto flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => runTest(k.provider)} disabled={test && 'pending' in test}>
                        {test && 'pending' in test ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
                        Test
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={`Move ${k.label} up`} disabled={i === 0 || reorder.isPending}
                        onClick={() => move(s.keys, i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Move ${k.label} down`} disabled={i === s.keys.length - 1 || reorder.isPending}
                        onClick={() => move(s.keys, i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Remove ${k.label} key`} disabled={remove.isPending}
                        onClick={() => { if (confirm(`Remove your ${k.label} key? It is deleted from the server.`)) remove.mutate(k.provider); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <KeyEditor saved={k} onSaved={setStatus} />
                  {test && 'ok' in test && (
                    test.ok
                      ? <p className="flex items-center gap-1.5 text-sm text-green-700"><CheckCircle className="h-4 w-4" />
                          Working: {test.result.model} replied “{test.result.reply}” in {(test.result.latency_ms / 1000).toFixed(1)}s</p>
                      : <p role="alert" className="text-sm text-destructive">{test.error}</p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <InlineError error={reorder.error ?? remove.error} />

        {s && <AddKeyForm status={s} onSaved={(next, provider) => { setStatus(next); runTest(provider); }} />}

        {s && s.keys.length > 1 && (
          <p className="text-xs text-muted-foreground">
            Requests go to your primary key. If it fails (out of credit, overloaded, revoked), the next key in the list answers instead.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Replace a saved key and/or change its model, without ever showing the old key. */
function KeyEditor({ saved, onSaved }: { saved: SavedAIKey; onSaved: (s: AIStatus) => void }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [model, setModel] = useState(saved.model ?? '');
  const save = useMutation({
    mutationFn: () => systemApi.saveKey(saved.provider, { ...(key.trim() ? { api_key: key.trim() } : {}), model: model.trim() }),
    onSuccess: (s) => { onSaved(s); setKey(''); setOpen(false); },
  });

  if (!open) {
    return (
      <p className="text-sm text-muted-foreground">
        Model <code className="rounded bg-muted px-1">{saved.model ?? saved.default_model}</code>
        {!saved.model && ' (default)'} ·{' '}
        <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => setOpen(true)}>
          Replace key or change model
        </button>
      </p>
    );
  }
  return (
    <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Input type="password" autoComplete="off" spellCheck={false} placeholder="New key (leave empty to keep the current one)"
        value={key} onChange={(e) => setKey(e.target.value)} aria-label={`New ${saved.label} key`} />
      <Input placeholder={saved.default_model} value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model" />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Save</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <div className="sm:col-span-3"><InlineError error={save.error} /></div>
    </form>
  );
}

function AddKeyForm({ status, onSaved }: { status: AIStatus; onSaved: (s: AIStatus, provider: string) => void }) {
  const available = useMemo(() => status.providers.filter((p) => !status.keys.some((k) => k.provider === p.name)), [status]);
  const [provider, setProvider] = useState('');
  const [key, setKey] = useState('');
  const [model, setModel] = useState('');
  const chosen = available.find((p) => p.name === provider) ?? available[0];

  const save = useMutation({
    mutationFn: () => systemApi.saveKey(chosen!.name, { api_key: key.trim(), ...(model.trim() ? { model: model.trim() } : {}) }),
    onSuccess: (s) => { onSaved(s, chosen!.name); setKey(''); setModel(''); setProvider(''); },
  });

  if (!chosen) return <p className="text-sm text-muted-foreground">You have a key saved for every supported provider.</p>;

  return (
    <form className="space-y-3 rounded-lg border border-dashed p-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <p className="text-sm font-medium">{status.keys.length === 0 ? 'Add your first key' : 'Add another key (used as a fallback)'}</p>
      <div className="grid gap-3 md:grid-cols-[minmax(0,12rem)_1fr]">
        <label className="text-sm">
          <span className="mb-1.5 block text-muted-foreground">Provider</span>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={chosen.name} onChange={(e) => setProvider(e.target.value)}>
            {available.map((p) => <option key={p.name} value={p.name}>{p.label}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 flex items-center justify-between text-muted-foreground">
            API key
            <a href={chosen.key_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Get your {chosen.label} key <ExternalLink className="h-3 w-3" />
            </a>
          </span>
          <Input type="password" required minLength={8} autoComplete="off" spellCheck={false}
            placeholder="Paste your key" value={key} onChange={(e) => setKey(e.target.value)} />
        </label>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Model (optional)</summary>
        <Input className="mt-2 md:w-1/2" placeholder={`${chosen.default_model} (default)`} value={model} onChange={(e) => setModel(e.target.value)} />
      </details>
      <InlineError error={save.error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={save.isPending || key.trim().length < 8}>
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
          Save and test
        </Button>
        <span className="text-xs text-muted-foreground">Encrypted before it is stored. We never display it again.</span>
      </div>
    </form>
  );
}
