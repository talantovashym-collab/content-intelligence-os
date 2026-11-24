'use client';

import React from 'react';
import { ModuleTemplate } from '@/components/layout/module-template';
import { Clapperboard, Zap, FileText, Image, Music, Scissors, Timeline, Plus, Play, CheckCircle, Loader2, Download, Eye, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const formats = [
  { id: 'stickman', name: 'Stickman', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12"/><path d="M12 3H4"/><path d="M12 3h8"/><path d="M12 15H4"/><path d="M12 15h8"/></svg>, color: 'from-blue-500 to-cyan-500' },
  { id: 'doodle', name: 'Doodle', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>, color: 'from-purple-500 to-pink-500' },
  { id: 'whiteboard', name: 'Whiteboard', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>, color: 'from-green-500 to-emerald-500' },
  { id: 'cartoon', name: 'Cartoon', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>, color: 'from-pink-500 to-rose-500' },
  { id: 'motion_graphics', name: 'Motion Graphics', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>, color: 'from-violet-500 to-purple-500' },
  { id: 'cinematic', name: 'Cinematic', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/></svg>, color: 'from-amber-500 to-orange-500' },
  { id: 'documentary', name: 'Documentary', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>, color: 'from-indigo-500 to-blue-500' },
  { id: 'educational', name: 'Educational', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>, color: 'from-teal-500 to-cyan-500' },
];

export default function ProductionPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Studio</h1>
          <p className="text-muted-foreground mt-1">
            Generate scripts, storyboards, assets, and complete production timelines
          </p>
        </div>
        <Button size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New Production
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Select Production Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {formats.map((format) => (
              <Button
                key={format.id}
                variant="outline"
                className={cn('relative aspect-square flex flex-col items-center justify-center gap-2 p-6 hover:border-primary/50 hover:shadow-lg transition-all', 'bg-gradient-to-br', format.color)}
                onClick={() => {}}
              >
                <div className="text-3xl">{format.icon}</div>
                <span className="font-semibold">{format.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-xl">Production Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Based on Strategy</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a creative strategy..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">AI Personal Finance for Gen Z Strategy</SelectItem>
                <SelectItem value="2">Micro-Habit Stacking Strategy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Script</label>
            <Textarea placeholder="Full script with dialogue, narration, and scene descriptions..." className="min-h-[200px]" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-2">Hooks</label>
              <Textarea placeholder="Opening hooks, mid-video hooks, closing hooks..." className="min-h-[100px]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Voiceover</label>
              <Textarea placeholder="Voiceover script with timing cues..." className="min-h-[100px]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Storyboard</label>
              <Textarea placeholder="Scene-by-scene descriptions with timing..." className="min-h-[100px]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Character Designs</label>
              <Textarea placeholder="Character descriptions, visual references..." className="min-h-[100px]" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-2">Animation Instructions</label>
              <Textarea placeholder="Animation style, transitions, effects..." className="min-h-[100px]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Visual Prompts</label>
              <Textarea placeholder="Image generation prompts for each scene..." className="min-h-[100px]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sound Design</label>
              <Textarea placeholder="SFX, ambience, audio cues..." className="min-h-[100px]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Music Direction</label>
              <Textarea placeholder="Genre, mood, tempo, specific tracks..." className="min-h-[100px]" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Editing Instructions</label>
              <Textarea placeholder="Pacing, transitions, text overlays, effects..." className="min-h-[100px]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Captions & Subtitles</label>
              <Textarea placeholder="Timed captions, translations, styling..." className="min-h-[100px]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Production Timeline</label>
            <Textarea placeholder="Phase breakdown with dates and milestones..." className="min-h-[100px]" />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline">Save as Draft</Button>
            <Button size="lg">
              <Zap className="h-4 w-4 mr-2" />
              Generate Production Assets
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Production Queue</CardTitle>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { id: '1', title: 'AI Finance for Gen Z', format: 'Motion Graphics', status: 'rendering', progress: 65, version: 2 },
              { id: '2', title: 'Micro-Habit Stacking', format: 'Whiteboard', status: 'queued', progress: 0, version: 1 },
              { id: '3', title: 'AI Finance v1', format: 'Motion Graphics', status: 'completed', progress: 100, version: 1 },
            ].map((prod) => (
              <div key={prod.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">{prod.title}</h4>
                    <span className="text-xs px-2 py-1 bg-muted rounded">{prod.format}</span>
                    <span className={cn('text-xs px-2 py-1 rounded',
                      prod.status === 'completed' && 'bg-green-100 text-green-800',
                      prod.status === 'rendering' && 'bg-blue-100 text-blue-800',
                      prod.status === 'queued' && 'bg-yellow-100 text-yellow-800',
                    )}>
                      {prod.status}
                    </span>
                    <span className="text-sm text-muted-foreground">v{prod.version}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {prod.status === 'rendering' && (
                      <div className="w-40">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${prod.progress}%` }} />
                        </div>
                        <span className="text-sm text-primary">{prod.progress}%</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {prod.status === 'completed' && <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>}
                      <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                    </div>
                  </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}