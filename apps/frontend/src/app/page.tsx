'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Search,
  Lightbulb,
  Video,
  Upload,
  TrendingUp,
  Zap,
  Brain,
  Target,
  Palette,
  Clapperboard,
  FlaskConical,
  Globe,
  BarChart,
  BookOpen,
  Settings,
  Menu,
  X,
  ChevronDown,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { name: 'Discover Opportunities', href: '/discover', icon: 'Search' },
  { name: 'My Ideas', href: '/ideas', icon: 'Lightbulb' },
  { name: 'Reference Research', href: '/research', icon: 'Video' },
  { name: 'Reference Library', href: '/library', icon: 'Upload' },
  { name: 'Investigation Studio', href: '/investigation', icon: 'Brain' },
  { name: 'Multi-Reference Intelligence', href: '/intelligence', icon: 'Target' },
  { name: 'Creative Strategy', href: '/strategy', icon: 'Palette' },
  { name: 'Production Studio', href: '/production', icon: 'Clapperboard' },
  { name: 'Testing Lab', href: '/testing', icon: 'FlaskConical' },
  { name: 'Publishing Center', href: '/publishing', icon: 'Globe' },
  { name: 'Performance Analytics', href: '/analytics', icon: 'BarChart' },
  { name: 'Knowledge Base', href: '/knowledge', icon: 'BookOpen' },
  { name: 'Settings', href: '/settings', icon: 'Settings' },
];

const entryPoints = [
  {
    id: 'discovery',
    title: 'AI Discovery Mode',
    description: 'Let AI research trends, find gaps, and generate ranked content opportunities for your niche.',
    icon: Search,
    color: 'from-blue-500 to-cyan-500',
    features: ['Trend analysis', 'Gap detection', 'Competitor research', 'Opportunity ranking'],
  },
  {
    id: 'idea',
    title: 'User Idea Mode',
    description: 'Enter your concept and get market validation, reference recommendations, and strategy.',
    icon: Lightbulb,
    color: 'from-amber-500 to-orange-500',
    features: ['Market validation', 'Reference finding', 'Angle suggestions', 'Feasibility analysis'],
  },
  {
    id: 'media',
    title: 'Ready Media Mode',
    description: 'Import existing videos and start reverse engineering their creative DNA immediately.',
    icon: Video,
    color: 'from-purple-500 to-pink-500',
    features: ['Multi-format import', 'Auto-indexing', 'Reverse engineering', 'Creative DNA extraction'],
  },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeEntryPoint, setActiveEntryPoint] = useState<'discovery' | 'idea' | 'media'>('discovery');

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">Content Intelligence OS</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <Button
                  key={item.name}
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-9 px-3"
                >
                  {item.icon === 'Search' && <Search className="h-4 w-4" />}
                  {item.icon === 'Lightbulb' && <Lightbulb className="h-4 w-4" />}
                  {item.icon === 'Video' && <Video className="h-4 w-4" />}
                  {item.icon === 'Upload' && <Upload className="h-4 w-4" />}
                  {item.icon === 'Brain' && <Brain className="h-4 w-4" />}
                  {item.icon === 'Target' && <Target className="h-4 w-4" />}
                  {item.icon === 'Palette' && <Palette className="h-4 w-4" />}
                  {item.icon === 'Clapperboard' && <Clapperboard className="h-4 w-4" />}
                  {item.icon === 'FlaskConical' && <FlaskConical className="h-4 w-4" />}
                  {item.icon === 'Globe' && <Globe className="h-4 w-4" />}
                  {item.icon === 'BarChart' && <BarChart className="h-4 w-4" />}
                  {item.icon === 'BookOpen' && <BookOpen className="h-4 w-4" />}
                  {item.icon === 'Settings' && <Settings className="h-4 w-4" />}
                  <span>{item.name}</span>
                </Button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">Sign In</Button>
            <Button size="sm">Get Started</Button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t px-4 py-4">
            <nav className="flex flex-col gap-2">
              {navigation.map((item) => (
                <Button key={item.name} variant="ghost" className="justify-start gap-2">
                  {item.icon === 'Search' && <Search className="h-4 w-4" />}
                  {item.icon === 'Lightbulb' && <Lightbulb className="h-4 w-4" />}
                  {item.icon === 'Video' && <Video className="h-4 w-4" />}
                  {item.icon === 'Upload' && <Upload className="h-4 w-4" />}
                  {item.icon === 'Brain' && <Brain className="h-4 w-4" />}
                  {item.icon === 'Target' && <Target className="h-4 w-4" />}
                  {item.icon === 'Palette' && <Palette className="h-4 w-4" />}
                  {item.icon === 'Clapperboard' && <Clapperboard className="h-4 w-4" />}
                  {item.icon === 'FlaskConical' && <FlaskConical className="h-4 w-4" />}
                  {item.icon === 'Globe' && <Globe className="h-4 w-4" />}
                  {item.icon === 'BarChart' && <BarChart className="h-4 w-4" />}
                  {item.icon === 'BookOpen' && <BookOpen className="h-4 w-4" />}
                  {item.icon === 'Settings' && <Settings className="h-4 w-4" />}
                  <span>{item.name}</span>
                </Button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Zap className="h-4 w-4" />
              <span>Complete Content Lifecycle Management</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              AI Content Intelligence &{' '}
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Autonomous Media Production OS
              </span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground max-w-2xl mx-auto">
              Manage the complete lifecycle: Opportunity Discovery → Idea Research → Reference Collection →
              Reverse Media Engineering → Creative Strategy → Media Production → Testing → Publishing →
              Performance Analysis → Continuous Improvement
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-2">
                <Zap className="h-5 w-5" />
                Start Free
              </Button>
              <Button variant="outline" size="lg">View Demo</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Three Entry Points */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Three Ways to Start</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every content project begins with one of three entry points — all converging into the same production pipeline
            </p>
          </div>

          {/* Entry Point Selector */}
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-1 rounded-lg bg-background p-1 shadow-sm">
              {entryPoints.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setActiveEntryPoint(entry.id as 'discovery' | 'idea' | 'media')}
                  className={cn(
                    'relative flex h-12 px-6 items-center gap-2 rounded-md text-sm font-medium transition-all',
                    activeEntryPoint === entry.id
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <entry.icon className="h-4 w-4" />
                  <span>{entry.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Entry Point Detail */}
          <div className="grid md:grid-cols-3 gap-6">
            {entryPoints.map((entry) => (
              <Card
                key={entry.id}
                className={cn(
                  'relative overflow-hidden transition-all duration-300',
                  activeEntryPoint === entry.id
                    ? 'ring-2 ring-primary shadow-lg scale-[1.02] z-10'
                    : 'opacity-60'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0 left-0 right-0 h-1',
                    activeEntryPoint === entry.id ? 'bg-gradient-to-r' : 'bg-muted'
                  )}
                  style={
                    activeEntryPoint === entry.id
                      ? { background: `linear-gradient(90deg, ${entry.color.replace('from-', '').replace('to-', '')})` }
                      : {}
                  }
                />
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', `bg-gradient-to-br ${entry.color}`)}>
                      <entry.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{entry.title}</h3>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {entry.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                          <CheckCheck className="h-3 w-3 text-primary" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {activeEntryPoint === entry.id && (
                    <Button className="mt-4 w-full" size="lg">
                      Start with {entry.title.split(' ')[0]} Mode
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline Overview */}
      <section className="py-20">
        <div className="container px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Complete Production Pipeline</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Eleven interconnected modules sharing one central database — from discovery to continuous learning
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[
              { name: 'Opportunity Discovery', icon: TrendingUp, color: 'from-blue-500 to-cyan-500', modules: 1 },
              { name: 'Reference Research', icon: Search, color: 'from-indigo-500 to-blue-500', modules: 2 },
              { name: 'Reference Library', icon: Upload, color: 'from-purple-500 to-indigo-500', modules: 3 },
              { name: 'Reverse Engineering', icon: Brain, color: 'from-pink-500 to-purple-500', modules: 4 },
              { name: 'Multi-Ref Intelligence', icon: Target, color: 'from-rose-500 to-pink-500', modules: 5 },
              { name: 'Creative Strategy', icon: Palette, color: 'from-orange-500 to-rose-500', modules: 6 },
              { name: 'Production Studio', icon: Clapperboard, color: 'from-amber-500 to-orange-500', modules: 7 },
              { name: 'Testing Lab', icon: FlaskConical, color: 'from-yellow-500 to-amber-500', modules: 8 },
              { name: 'Publishing Center', icon: Globe, color: 'from-lime-500 to-yellow-500', modules: 9 },
              { name: 'Performance Analytics', icon: BarChart, color: 'from-green-500 to-lime-500', modules: 10 },
              { name: 'Continuous Learning', icon: BookOpen, color: 'from-emerald-500 to-green-500', modules: 11 },
            ].map((module, i) => (
              <Card key={module.name} className="group hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', `bg-gradient-to-br ${module.color}`)}>
                      <module.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{module.name}</h3>
                        <span className="text-xs text-muted-foreground">Module {module.modules}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {i === 0 && 'AI researches trends, finds gaps, ranks opportunities'}
                        {i === 1 && 'Finds real references, analyzes competitors'}
                        {i === 2 && 'Two-click save & investigate workflow'}
                        {i === 3 && 'Frame-by-frame, audio, text, creative analysis'}
                        {i === 4 && 'Cross-reference pattern detection & DNA extraction'}
                        {i === 5 && 'Generates original strategy from research + patterns'}
                        {i === 6 && 'Scripts, storyboards, assets, timeline generation'}
                        {i === 7 && 'A/B test hooks, scripts, voiceovers, animations'}
                        {i === 8 && 'Multi-platform scheduling & publishing'}
                        {i === 9 && 'Real analytics, prediction comparison, insights'}
                        {i === 10 && 'Feeds learnings back into discovery engine'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Built for Production</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Modern, modular architecture with type-safe contracts across the stack
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { name: 'Frontend', items: ['Next.js 14', 'React 18', 'TypeScript', 'Tailwind CSS', 'Radix UI', 'TanStack Query'] },
              { name: 'Backend', items: ['FastAPI', 'Python 3.11', 'SQLAlchemy 2.0', 'Pydantic v2', 'Celery', 'Redis'] },
              { name: 'Database', items: ['PostgreSQL', 'pgvector', 'Prisma ORM', 'Alembic', 'AsyncPG'] },
              { name: 'AI & Media', items: ['OpenAI', 'Anthropic', 'Gemini', 'ElevenLabs', 'FFmpeg', 'Whisper', 'OpenCV'] },
            ].map((stack) => (
              <Card key={stack.name}>
                <CardHeader>
                  <h3 className="font-semibold">{stack.name}</h3>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stack.items.map((item) => (
                      <span key={item} className="px-2 py-1 text-xs rounded bg-muted">
                        {item}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20">
        <div className="container px-4 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-3xl font-bold">Ready to Build Your Content Intelligence?</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join creators and teams using AI to discover, research, produce, and optimize content at scale.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-2">
                <Zap className="h-5 w-5" />
                Start Free Trial
              </Button>
              <Button variant="outline" size="lg">Schedule Demo</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl">Content Intelligence OS</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI Content Intelligence & Autonomous Media Production Operating System
              </p>
            </div>
            <nav>
              <h4 className="font-semibold mb-4">Modules</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Opportunity Discovery</li>
                <li>Reference Research</li>
                <li>Reverse Engineering</li>
                <li>Creative Strategy</li>
                <li>Production Studio</li>
                <li>Testing Lab</li>
                <li>Publishing Center</li>
                <li>Performance Analytics</li>
              </ul>
            </nav>
            <nav>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Documentation</li>
                <li>API Reference</li>
                <li>Community</li>
                <li>Blog</li>
                <li>Changelog</li>
              </ul>
            </nav>
            <nav>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>About</li>
                <li>Careers</li>
                <li>Privacy</li>
                <li>Terms</li>
                <li>Contact</li>
              </ul>
            </nav>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            © 2024 Content Intelligence OS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}