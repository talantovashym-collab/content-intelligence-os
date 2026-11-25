'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Search, Lightbulb, Video, Brain, Target, Palette, Clapperboard, FlaskConical, Globe, BarChart, BookOpen, Zap, Plus, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PLATFORMS, PLATFORM_LABELS, humanize, productionsApi, projectsApi, strategiesApi, type Platform, type Project } from '@/lib/api';
import { useProjects } from '@/lib/project-context';

const modules = [
  {
    id: 'discover',
    name: 'Discover Opportunities',
    description: 'AI-powered trend research, gap detection, and opportunity ranking',
    icon: Search,
    color: 'from-blue-500 to-cyan-500',
    href: '/discover',
    status: 'live',
  },
  {
    id: 'ideas',
    name: 'My Ideas',
    description: 'Enter concepts, get market validation, and find reference recommendations',
    icon: Lightbulb,
    color: 'from-amber-500 to-orange-500',
    href: '/ideas',
    status: 'live',
  },
  {
    id: 'research',
    name: 'Reference Research',
    description: 'Find and analyze real reference videos across platforms',
    icon: Video,
    color: 'from-purple-500 to-pink-500',
    href: '/research',
    status: 'live',
  },
  {
    id: 'investigation',
    name: 'Investigation Studio',
    description: 'Frame-by-frame, audio, text, and creative technique analysis',
    icon: Brain,
    color: 'from-pink-500 to-rose-500',
    href: '/investigation',
    status: 'live',
  },
  {
    id: 'intelligence',
    name: 'Multi-Reference Intelligence',
    description: 'Cross-reference pattern detection, creative DNA extraction, and style profiles',
    icon: Target,
    color: 'from-rose-500 to-red-500',
    href: '/intelligence',
    status: 'live',
  },
  {
    id: 'strategy',
    name: 'Creative Strategy',
    description: 'Generate original creative strategies from research and patterns',
    icon: Palette,
    color: 'from-orange-500 to-amber-500',
    href: '/strategy',
    status: 'live',
  },
  {
    id: 'production',
    name: 'Production Studio',
    description: 'Scripts, storyboards, assets, and timeline generation',
    icon: Clapperboard,
    color: 'from-amber-500 to-yellow-500',
    href: '/production',
    status: 'live',
  },
  {
    id: 'testing',
    name: 'Testing Lab',
    description: 'A/B test hooks, scripts, voiceovers, and animations',
    icon: FlaskConical,
    color: 'from-yellow-500 to-lime-500',
    href: '/testing',
    status: 'live',
  },
  {
    id: 'publishing',
    name: 'Publishing Center',
    description: 'Multi-platform scheduling, optimization, and publishing',
    icon: Globe,
    color: 'from-lime-500 to-green-500',
    href: '/publishing',
    status: 'live',
  },
  {
    id: 'analytics',
    name: 'Performance Analytics',
    description: 'Real analytics, prediction comparison, and insights',
    icon: BarChart,
    color: 'from-green-500 to-emerald-500',
    href: '/analytics',
    status: 'live',
  },
  {
    id: 'knowledge',
    name: 'Knowledge Base',
    description: 'Continuous learning from publishing results and experiments',
    icon: BookOpen,
    color: 'from-emerald-500 to-teal-500',
    href: '/knowledge',
    status: 'live',
  },
];

const STATUS_BADGE = {
  live: { label: 'Live', className: 'bg-green-100 text-green-800', cta: 'Open Module' },
  preview: { label: 'Sample data', className: 'bg-blue-100 text-blue-800', cta: 'Preview Module' },
  planned: { label: 'Planned', className: 'bg-yellow-100 text-yellow-800', cta: 'Coming Soon' },
} as const;

export default function DashboardPage() {
  const { projects, current, setCurrentId, isLoading } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const projectId = current?.id;

  const strategies = useQuery({
    queryKey: ['strategies', projectId],
    queryFn: () => strategiesApi.list(projectId!),
    enabled: !!projectId,
  });
  const productions = useQuery({
    queryKey: ['productions', projectId],
    queryFn: () => productionsApi.list(projectId!),
    enabled: !!projectId,
  });

  const approved = strategies.data?.strategies.filter((s) => s.is_approved).length;
  const stats = [
    { title: 'Projects', value: isLoading ? undefined : projects.length, note: 'All your projects' },
    { title: 'Strategies', value: strategies.data?.total, note: current ? `In ${current.title}` : 'Select a project' },
    { title: 'Approved Strategies', value: approved, note: 'Ready for production' },
    { title: 'Productions', value: productions.data?.total, note: current ? `In ${current.title}` : 'Select a project' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your complete content lifecycle from discovery to continuous learning
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value ?? '–'}</div>
              <p className="text-xs text-muted-foreground truncate">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section id="projects" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-bold">Your Projects</h2>

        {(showForm || (!isLoading && projects.length === 0)) && (
          <NewProjectForm
            onCancel={projects.length > 0 ? () => setShowForm(false) : undefined}
            onCreated={(id) => {
              setCurrentId(id);
              setShowForm(false);
            }}
          />
        )}

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                selected={project.id === current?.id}
                onSelect={() => setCurrentId(project.id)}
              />
            ))}
          </div>
        )}
      </section>

      <div>
        <h2 className="text-2xl font-bold mb-4">Content Production Pipeline</h2>
        <p className="text-muted-foreground mb-6">
          Each module saves its work to the selected project and feeds the next step.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map((module) => {
            const badge = STATUS_BADGE[module.status as keyof typeof STATUS_BADGE];
            return (
              <Link key={module.id} href={module.href}>
                <Card
                  className={cn(
                    'group h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer',
                    module.status === 'planned' && 'opacity-60'
                  )}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', `bg-gradient-to-br ${module.color}`)}>
                        <module.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className={cn('text-xs px-2 py-1 rounded-full', badge.className)}>{badge.label}</span>
                    </div>
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{module.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">{badge.cta}</span>
                      <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, selected, onSelect }: { project: Project; selected: boolean; onSelect: () => void }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => projectsApi.remove(project.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      className={cn('cursor-pointer transition-all hover:shadow-md', selected && 'border-primary ring-1 ring-primary')}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{project.title}</CardTitle>
          {selected && <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Selected</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {project.niche && <p className="text-sm text-muted-foreground">{project.niche}</p>}
        <div className="flex flex-wrap gap-1">
          <span className="rounded bg-muted px-2 py-0.5 text-xs">{humanize(project.stage)}</span>
          {project.platforms.map((p) => (
            <span key={p} className="rounded bg-muted px-2 py-0.5 text-xs">{PLATFORM_LABELS[p] ?? humanize(p)}</span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">Created {new Date(project.created_at).toLocaleDateString()}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-destructive"
            disabled={remove.isPending}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${project.title}" and all of its strategies and productions? This cannot be undone.`)) {
                remove.mutate();
              }
            }}
            aria-label={`Delete ${project.title}`}
          >
            {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
        {remove.isError && <p className="text-xs text-destructive">{remove.error.message}</p>}
      </CardContent>
    </Card>
  );
}

function NewProjectForm({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel?: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [niche, setNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [description, setDescription] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>(['YOUTUBE']);

  const create = useMutation({
    mutationFn: () =>
      projectsApi.create({
        title: title.trim(),
        niche: niche.trim() || undefined,
        target_audience: targetAudience.trim() || undefined,
        description: description.trim() || undefined,
        platforms,
      }),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      onCreated(project.id);
    },
  });

  const togglePlatform = (p: Platform) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">New project</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="project-title" className="block text-sm font-medium mb-1.5">Title</label>
              <Input id="project-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Personal finance explainers" />
            </div>
            <div>
              <label htmlFor="project-niche" className="block text-sm font-medium mb-1.5">Niche</label>
              <Input id="project-niche" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g., Personal finance" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="project-audience" className="block text-sm font-medium mb-1.5">Target audience</label>
              <Textarea id="project-audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Who is this content for?" />
            </div>
            <div>
              <label htmlFor="project-description" className="block text-sm font-medium mb-1.5">Description</label>
              <Textarea id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" />
            </div>
          </div>
          <fieldset>
            <legend className="block text-sm font-medium mb-1.5">Platforms</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={platforms.includes(p)} onChange={() => togglePlatform(p)} className="rounded border-input" />
                  {PLATFORM_LABELS[p]}
                </label>
              ))}
            </div>
          </fieldset>
          {create.isError && <p role="alert" className="text-sm text-destructive">{create.error.message}</p>}
          <div className="flex justify-end gap-2">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
            <Button type="submit" disabled={create.isPending || !title.trim()}>
              {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create project
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
