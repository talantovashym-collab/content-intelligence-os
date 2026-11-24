'use client';

import React from 'react';
import { ModuleTemplate } from '@/components/layout/module-template';
import { FlaskConical, Zap, BarChart, ArrowRight, CheckCircle, XCircle, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const testTypes = [
  { id: 'hook', name: 'Hook Alternatives', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 4.993-5.539 10.193-10 11V6a8 8 0 0 0-16 0v12"/><path d="M10 12h.01"/><path d="M14 12h.01"/></svg>, color: 'from-blue-500 to-cyan-500' },
  { id: 'opening', name: 'Opening Scene', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>, color: 'from-purple-500 to-pink-500' },
  { id: 'script', name: 'Script Alternatives', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>, color: 'from-purple-500 to-indigo-500' },
  { id: 'voiceover', name: 'Voiceover Alternatives', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="19"/></svg>, color: 'from-green-500 to-emerald-500' },
  { id: 'narrative', name: 'Narrative Approaches', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>, color: 'from-amber-500 to-orange-500' },
  { id: 'animation', name: 'Animation Variations', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>, color: 'from-violet-500 to-purple-500' },
  { id: 'duration', name: 'Duration Comparison', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>, color: 'from-amber-500 to-yellow-500' },
  { id: 'visual', name: 'Visual Consistency', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>, color: 'from-rose-500 to-pink-500' },
  { id: 'audio', name: 'Audio Quality', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="19"/></svg>, color: 'from-indigo-500 to-blue-500' },
  { id: 'subtitle', name: 'Subtitle Verification', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>, color: 'from-slate-500 to-gray-500' },
];

export default function TestingPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Testing Lab</h1>
          <p className="text-muted-foreground mt-1">
            A/B test hooks, scripts, voiceovers, animations, and more before publishing
          </p>
        </div>
        <Button size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New Test
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {testTypes.map((test) => (
          <div key={test.id} className="group">
            <Card className={cn('hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer', 'bg-gradient-to-br', test.color)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white">
                    {test.icon}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">Ready</span>
                </div>
                <CardTitle className="text-lg">{test.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-xl">Create New Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Based on Production</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a production..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">AI Finance for Gen Z - Motion Graphics v2</SelectItem>
                <SelectItem value="2">Micro-Habit Stacking - Whiteboard v1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Test Type</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select test type" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { id: 'hook', name: 'Hook Alternatives' },
                    { id: 'opening', name: 'Opening Scene' },
                    { id: 'script', name: 'Script Alternatives' },
                    { id: 'voiceover', name: 'Voiceover Alternatives' },
                    { id: 'narrative', name: 'Narrative Approaches' },
                    { id: 'animation', name: 'Animation Variations' },
                    { id: 'duration', name: 'Duration Comparison' },
                    { id: 'visual', name: 'Visual Consistency' },
                    { id: 'audio', name: 'Audio Quality' },
                    { id: 'subtitle', name: 'Subtitle Verification' },
                  ].map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Test Name</label>
              <Input placeholder="e.g., Hook A/B Test - Question vs Statement" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Variants to Test</label>
            <div className="space-y-3">
              {['Variant A (Control)', 'Variant B', 'Variant C'].map((variant, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder={`Variant ${String.fromCharCode(65+i)}`} className="flex-1" />
                  <Textarea placeholder={`Description of ${String.fromCharCode(65+i)}`} className="min-h-[60px]" />
                </div>
              ))}
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Add Variant</Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Success Metrics</label>
              <div className="space-y-2">
                {['CTR (Click-Through Rate)', 'Retention Rate', 'Completion Rate', 'Engagement Rate', 'Conversion Rate'].map((metric, i) => (
                  <label key={i} className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded border-input" />
                    <span className="text-sm">{metric}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Test Duration (days)</label>
              <Input type="number" placeholder="14" defaultValue="14" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Hypothesis</label>
            <Textarea placeholder="What do you expect to happen and why?" className="min-h-[80px]" />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline">Cancel</Button>
            <Button size="lg">
              <Zap className="h-4 w-4 mr-2" />
              Launch Test
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Active Tests</CardTitle>
          <Button variant="outline" size="sm">
            <Loader2 className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { id: '1', name: 'Hook A/B - Question vs Bold', type: 'Hook Alternatives', status: 'running', progress: 45, variants: 2, daysLeft: 7 },
              { id: '2', name: 'Script A/B - Problem-First vs Story-First', type: 'Script Alternatives', status: 'completed', progress: 100, variants: 3, winner: 'Variant B' },
              { id: '3', name: 'VO A/B - Energetic vs Calm', type: 'Voiceover Alternatives', status: 'pending', progress: 0, variants: 2 },
            ].map((test) => (
              <div key={test.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">{test.name}</h4>
                    <span className="text-xs px-2 py-1 bg-muted rounded">{test.type}</span>
                    <span className={cn('text-xs px-2 py-1 rounded',
                      test.status === 'completed' && 'bg-green-100 text-green-800',
                      test.status === 'running' && 'bg-blue-100 text-blue-800',
                      test.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                    )}>
                      {test.status}
                    </span>
                    {test.winner && <span className="text-xs px-2 py-1 bg-green-100 text-green-800">Winner: {test.winner}</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    {test.status === 'running' && (
                      <div className="w-40">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${test.progress}%` }} />
                        </div>
                        <span className="text-sm text-primary">{test.progress}%</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm"><BarChart className="h-4 w-4" /></Button>
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