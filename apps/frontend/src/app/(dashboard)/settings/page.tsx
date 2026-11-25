'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Circle, Loader2, Settings, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/page-header';
import { InlineError } from '@/components/source-note';
import { cn } from '@/lib/utils';
import { PLATFORMS, PLATFORM_LABELS, accountApi, projectsApi, systemApi, type Platform, type Project } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useProjects } from '@/lib/project-context';

export default function SettingsPage() {
  const { current } = useProjects();
  return (
    <div className="space-y-6">
      <PageHeader icon={Settings} color="from-slate-500 to-slate-700" title="Settings"
        description="Your account, the AI provider, and the current project" />
      <AiProviderCard />
      {current && <ProjectSettings key={current.id} project={current} />}
      <ProfileCard />
    </div>
  );
}

function AiProviderCard() {
  const status = useQuery({ queryKey: ['system', 'ai'], queryFn: systemApi.ai });
  const test = useMutation({ mutationFn: systemApi.testAi });
  const s = status.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">AI provider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        <InlineError error={status.error} />
        {s && (
          <>
            <p className="text-sm">
              {s.active_label ? (
                <>Using <span className="font-semibold">{s.active_label}</span> with model <code className="rounded bg-muted px-1">{s.model}</code>.</>
              ) : (
                <>No provider configured. Every AI feature still works, but produces template output instead of real analysis.</>
              )}
              {s.requested_provider && !s.active_label && (
                <span className="block text-amber-700">LLM_PROVIDER is set to “{s.requested_provider}” but that provider has no key.</span>
              )}
              {s.fallback && s.fallback_order.length > 0 && (
                <span className="block text-muted-foreground">
                  If it fails (no credit, overloaded), requests go on to: {s.fallback_order.join(' → ')}.
                </span>
              )}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {s.providers.map((p) => (
                <div key={p.name} className={cn('flex items-center gap-2 rounded-md border p-2 text-sm', p.name === s.active_provider && 'border-primary')}>
                  {p.configured ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-medium">{p.label}</span>
                  {p.cooling_down && <span className="text-xs text-amber-700">failed recently</span>}
                  <code className="ml-auto text-xs text-muted-foreground">{p.env}</code>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending || !s.active_provider}>
                {test.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}Test connection
              </Button>
              {test.data && (
                <span className="text-sm text-green-700">
                  Working: {test.data.model} replied “{test.data.reply}” in {(test.data.latency_ms / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            <InlineError error={test.error} />
          </>
        )}
        <details className="rounded-md bg-muted/40 p-3 text-sm">
          <summary className="cursor-pointer font-medium">How to add a key</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Get an API key from one provider (OpenAI, Anthropic, Google Gemini, Mistral, Groq, DeepSeek, OpenRouter, NVIDIA NIM, Vercel AI Gateway, TeamoRouter or Token Harbor).</li>
            <li>
              Open the <code>.env</code> file in the project folder and set its line, e.g. <code>MISTRAL_API_KEY=&quot;your-key&quot;</code>.
              Use the exact variable name shown above. Optional: <code>LLM_MODEL</code> picks a different model, <code>LLM_PROVIDER</code> picks which one goes first when several keys are set.
            </li>
            <li>Restart the backend: <code>docker compose up -d backend celery-worker</code>, then press Test connection.</li>
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">Keys stay on the server; this page never shows or stores them.</p>
        </details>
      </CardContent>
    </Card>
  );
}

function ProjectSettings({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(project.title);
  const [niche, setNiche] = useState(project.niche ?? '');
  const [audience, setAudience] = useState(project.target_audience ?? '');
  const [description, setDescription] = useState(project.description ?? '');
  const [language, setLanguage] = useState(project.language);
  const [country, setCountry] = useState(project.country);
  const [platforms, setPlatforms] = useState<Platform[]>(project.platforms);

  const save = useMutation({
    mutationFn: () => projectsApi.update(project.id, {
      title: title.trim(), niche: niche.trim(), target_audience: audience.trim(), description: description.trim(),
      language: language.trim() || 'en', country: country.trim().toUpperCase() || 'US', platforms,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
  const toggle = (p: Platform) => setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Project: {project.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Title<Input className="mt-1.5" required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label className="text-sm font-medium">Niche<Input className="mt-1.5" value={niche} onChange={(e) => setNiche(e.target.value)} /></label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Target audience<Textarea className="mt-1.5" value={audience} onChange={(e) => setAudience(e.target.value)} /></label>
            <label className="text-sm font-medium">Description<Textarea className="mt-1.5" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:w-1/2">
            <label className="text-sm font-medium">Language<Input className="mt-1.5" value={language} maxLength={10} onChange={(e) => setLanguage(e.target.value)} placeholder="en" /></label>
            <label className="text-sm font-medium">Country<Input className="mt-1.5" value={country} maxLength={2} onChange={(e) => setCountry(e.target.value)} placeholder="US" /></label>
          </div>
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium">Platforms</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={platforms.includes(p)} onChange={() => toggle(p)} className="rounded border-input" />
                  {PLATFORM_LABELS[p]}
                </label>
              ))}
            </div>
          </fieldset>
          <InlineError error={save.error} />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={save.isPending || !title.trim()}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save project
            </Button>
            {save.isSuccess && <span className="text-sm text-green-700">Saved</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ProfileCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const saveName = useMutation({
    mutationFn: () => accountApi.update({ name: name.trim() || null }),
    onSuccess: (u) => queryClient.setQueryData(['me'], u),
  });
  const savePassword = useMutation({
    mutationFn: () => accountApi.update({ current_password: currentPassword, new_password: newPassword }),
    onSuccess: () => { setCurrentPassword(''); setNewPassword(''); },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Account</CardTitle>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveName.mutate(); }}>
          <label className="block text-sm font-medium">Name<Input className="mt-1.5" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
          <InlineError error={saveName.error} />
          <div className="flex items-center gap-3">
            <Button type="submit" variant="outline" disabled={saveName.isPending || name.trim() === (user.name ?? '')}>Save name</Button>
            {saveName.isSuccess && <span className="text-sm text-green-700">Saved</span>}
          </div>
        </form>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); savePassword.mutate(); }}>
          <label className="block text-sm font-medium">Current password
            <Input className="mt-1.5" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
          </label>
          <label className="block text-sm font-medium">New password (at least 8 characters)
            <Input className="mt-1.5" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </label>
          <InlineError error={savePassword.error} />
          <div className="flex items-center gap-3">
            <Button type="submit" variant="outline" disabled={savePassword.isPending || !currentPassword || newPassword.length < 8}>Change password</Button>
            {savePassword.isSuccess && <span className="text-sm text-green-700">Password changed</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
