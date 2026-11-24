'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search, Lightbulb, Video, Brain, Target, Palette, Clapperboard, FlaskConical, Globe, BarChart, BookOpen, Zap, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const modules = [
  {
    id: 'discover',
    name: 'Discover Opportunities',
    description: 'AI-powered trend research, gap detection, and opportunity ranking',
    icon: Search,
    color: 'from-blue-500 to-cyan-500',
    href: '/discover',
    status: 'ready',
  },
  {
    id: 'ideas',
    name: 'My Ideas',
    description: 'Enter concepts, get market validation, and find reference recommendations',
    icon: Lightbulb,
    color: 'from-amber-500 to-orange-500',
    href: '/ideas',
    status: 'ready',
  },
  {
    id: 'research',
    name: 'Reference Research',
    description: 'Find and analyze real reference videos across platforms',
    icon: Video,
    color: 'from-purple-500 to-pink-500',
    href: '/research',
    status: 'ready',
  },
  {
    id: 'investigation',
    name: 'Investigation Studio',
    description: 'Frame-by-frame, audio, text, and creative technique analysis',
    icon: Brain,
    color: 'from-pink-500 to-rose-500',
    href: '/investigation',
    status: 'ready',
  },
  {
    id: 'intelligence',
    name: 'Multi-Reference Intelligence',
    description: 'Cross-reference pattern detection, creative DNA extraction, and style profiles',
    icon: Target,
    color: 'from-rose-500 to-red-500',
    href: '/intelligence',
    status: 'ready',
  },
  {
    id: 'strategy',
    name: 'Creative Strategy',
    description: 'Generate original creative strategies from research and patterns',
    icon: Palette,
    color: 'from-orange-500 to-amber-500',
    href: '/strategy',
    status: 'planned',
  },
  {
    id: 'production',
    name: 'Production Studio',
    description: 'Scripts, storyboards, assets, and timeline generation',
    icon: Clapperboard,
    color: 'from-amber-500 to-yellow-500',
    href: '/production',
    status: 'planned',
  },
  {
    id: 'testing',
    name: 'Testing Lab',
    description: 'A/B test hooks, scripts, voiceovers, and animations',
    icon: FlaskConical,
    color: 'from-yellow-500 to-lime-500',
    href: '/testing',
    status: 'planned',
  },
  {
    id: 'publishing',
    name: 'Publishing Center',
    description: 'Multi-platform scheduling, optimization, and publishing',
    icon: Globe,
    color: 'from-lime-500 to-green-500',
    href: '/publishing',
    status: 'planned',
  },
  {
    id: 'analytics',
    name: 'Performance Analytics',
    description: 'Real analytics, prediction comparison, and insights',
    icon: BarChart,
    color: 'from-green-500 to-emerald-500',
    href: '/analytics',
    status: 'planned',
  },
  {
    id: 'knowledge',
    name: 'Knowledge Base',
    description: 'Continuous learning from publishing results and experiments',
    icon: BookOpen,
    color: 'from-emerald-500 to-teal-500',
    href: '/knowledge',
    status: 'planned',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your complete content lifecycle from discovery to continuous learning
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Quick Discover
          </Button>
          <Button size="sm">
            <Zap className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">+2 this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">References Collected</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">+12 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analyses Completed</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">+5 today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Videos</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">+2 this month</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Content Production Pipeline</h2>
        <p className="text-muted-foreground mb-6">
          Click any module to start working. Ready modules are fully implemented; planned modules are in development.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map((module) => (
            <Link key={module.id} href={module.href}>
              <Card
                className={cn(
                  'group transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer',
                  module.status === 'planned' && 'opacity-60'
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', `bg-gradient-to-br ${module.color}`)}>
                      <module.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className={cn('text-xs px-2 py-1 rounded-full', module.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                      {module.status === 'ready' ? 'Ready' : 'Planned'}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{module.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{module.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">
                      {module.status === 'ready' ? 'Open Module' : 'Coming Soon'}
                    </span>
                    <ArrowRight className={cn('h-4 w-4 transition-transform group-hover:translate-x-1', module.status === 'ready' ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/discover">
            <Card className="group hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold">Start AI Discovery</h3>
                <p className="text-sm text-muted-foreground mt-1">Let AI research trends and find opportunities</p>
                <ArrowUpRight className="mt-4 h-5 w-5 text-primary group-hover:translate-x-1 group-hover:translate-y-[-1px] transition-all" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/research">
            <Card className="group hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
                  <Video className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold">Research References</h3>
                <p className="text-sm text-muted-foreground mt-1">Find and import real reference videos</p>
                <ArrowUpRight className="mt-4 h-5 w-5 text-primary group-hover:translate-x-1 group-hover:translate-y-[-1px] transition-all" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/intelligence">
            <Card className="group hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-500 mb-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold">Analyze Multiple References</h3>
                <p className="text-sm text-muted-foreground mt-1">Extract creative DNA from multiple videos</p>
                <ArrowUpRight className="mt-4 h-5 w-5 text-primary group-hover:translate-x-1 group-hover:translate-y-[-1px] transition-all" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}