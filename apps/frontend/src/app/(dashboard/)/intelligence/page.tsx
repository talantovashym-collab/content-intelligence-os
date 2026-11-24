'use client';

import React from 'react';
import { ModuleTemplate } from '@/components/layout/module-template';
import { Target, Brain, Zap, Palette, BookOpen, TrendingUp, Search, Filter, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Reference {
  id: string;
  title: string;
  platform: string;
  status: string;
}

const mockReferences = [
  { id: '1', title: 'How I Built a $10K/Month Side Hustle', platform: 'YouTube', status: 'analyzed' },
  { id: '2', title: 'The Psychology of Viral Content', platform: 'TikTok', status: 'analyzed' },
  { id: '3', title: 'Building Systems, Not Goals', platform: 'YouTube', status: 'indexed' },
  { id: '4', title: 'Micro-Habits That Changed My Life', platform: 'TikTok', status: 'analyzed' },
  { id: '4', title: 'AI Tools for Content Creators 2024', platform: 'YouTube', status: 'indexed' },
  { id: '5', title: 'Building a Personal Brand from Zero', platform: 'Instagram', status: 'downloaded' },
];

const mockDNA = {
  corePatterns: [
    { patternType: 'hook', patternName: 'Question Hook', frequency: 4, confidence: 0.9 },
    { patternType: 'narrative', patternName: 'Problem-Solution', frequency: 5, confidence: 0.95 },
    { patternType: 'editing', patternName: 'Quick Cuts (0.5-1s)', frequency: 3, confidence: 0.8 },
    { patternType: 'visual', patternName: 'Text Overlays on Key Points', frequency: 5, confidence: 0.9 },
  ],
  dominantHooks: ['Question Hook', 'Bold Statement', 'Visual Teaser'],
  narrativeStructure: 'problem_solution',
  styleProfile: { visualStyle: 'modern_dynamic', colorPalette: ['#1a1a2e', '#e94560'], editingPace: 'fast' },
  storytellingProfile: { narrativeStructure: 'problem_solution', hookTypes: ['question', 'bold_statement'] },
  transferPrinciples: [
    { principleName: 'Hook-First Structure', confidence: 0.85 },
    { principleName: 'Problem-Solution Narrative', confidence: 0.82 },
    { principleName: 'Visual Rhythm Sync', confidence: 0.78 },
  ],
};

export default function IntelligencePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multi-Reference Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Cross-reference pattern detection, creative DNA extraction, and transferable principles
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Target className="h-4 w-4 mr-2" />
          New Analysis
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Run Multi-Reference Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Select References (min 2)</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose references..." />
                </SelectTrigger>
                <SelectContent>
                  {mockReferences.map((ref) => (
                    <SelectItem key={ref.id} value={ref.id}>
                      {ref.title} ({ref.platform}) - {ref.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Focus Areas</label>
              <div className="space-y-2">
                {['creative_dna', 'style_profile', 'storytelling_profile', 'transfer_principles', 'performance_comparison'].map((focus) => (
                  <label key={focus} className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded border-input" />
                    <span className="text-sm capitalize">{focus.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <Button size="lg" className="w-full">
            <Target className="h-4 w-4 mr-2" />
            Analyze References
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Analysis Results</h2>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Shared Creative DNA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { patternType: 'hook', patternName: 'Question Hook', frequency: 4, confidence: 0.9 },
                { patternType: 'narrative', patternName: 'Problem-Solution', frequency: 5, confidence: 0.95 },
                { patternType: 'editing', patternName: 'Quick Cuts (0.5-1s)', frequency: 3, confidence: 0.8 },
                { patternType: 'visual', patternName: 'Text Overlays on Key Points', frequency: 5, confidence: 0.9 },
              ].map((pattern, i) => (
                <Card key={i} className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">{pattern.patternType}</p>
                    <h4 className="font-semibold">{pattern.patternName}</h4>
                    <p className="text-sm text-muted-foreground">Found in {pattern.frequency}/6 references</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pattern.confidence * 100}%` }} />
                      </div>
                      <span className="text-xs text-primary font-medium">{Math.round(pattern.confidence * 100)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-3">Dominant Hooks</h4>
              <div className="flex flex-wrap gap-2">
                {['Question Hook', 'Bold Statement', 'Visual Teaser'].map((hook, i) => (
                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">{hook}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palettte className="h-5 w-5 text-primary" />
                Style Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries({ visualStyle: 'modern_dynamic', colorPalette: '#1a1a2e, #e94560', editingPace: 'fast' }).map(([key, value]) => (
                  <div key={key} className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Storytelling Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries({ narrativeStructure: 'problem_solution', hookTypes: 'question, bold_statement' }).map(([key, value]) => (
                  <div key={key} className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Transfer Principles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { principleName: 'Hook-First Structure', confidence: 0.85, description: 'Lead with strong visual/verbal hook within 3 seconds', sourcePattern: '70% of top-performing references use visual hook in first 1.5s', targetApplication: 'Design opening frame first', prerequisites: ['Strong visual concept', 'Clear value proposition'] },
              { principleName: 'Problem-Solution Narrative', confidence: 0.82, description: 'Structure as problem → agitation → solution → proof', sourcePattern: '85% of high-retention videos follow problem-solution arc', targetApplication: 'Map content to problem-agitation-solution-proof', prerequisites: ['Clear audience pain point', 'Demonstrable solution'] },
              { principleName: 'Visual Rhythm Sync', confidence: 0.78, description: 'Sync cuts/transitions to audio beats or speech rhythm', sourcePattern: 'High-retention videos show 2.3x more beat-synced edits', targetApplication: 'Edit to audio waveform; use markers for beat alignment', prerequisites: ['Music/beat track', 'Editing software with waveform view'] },
            ].map((principle, i) => (
              <Card key={i} className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold">{principle.principleName}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{principle.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">Source: {principle.sourcePattern}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${principle.confidence * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium text-primary">{Math.round(principle.confidence * 100)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Quick DNA Extraction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select references..." />
              </SelectTrigger>
              <SelectContent>
                {[
                  { id: '1', title: 'How I Built a $10K/Month Side Hustle', platform: 'YouTube', status: 'analyzed' },
                  { id: '2', title: 'The Psychology of Viral Content', platform: 'TikTok', status: 'analyzed' },
                  { id: '3', title: 'Building Systems, Not Goals', platform: 'YouTube', status: 'indexed' },
                  { id: '4', title: 'Micro-Habits That Changed My Life', platform: 'TikTok', status: 'analyzed' },
                  { id: '5', title: 'AI Tools for Content Creators 2024', platform: 'YouTube', status: 'indexed' },
                  { id: '6', title: 'Building a Personal Brand from Zero', platform: 'Instagram', status: 'downloaded' },
                ].map((ref) => (
                  <SelectItem key={ref.id} value={ref.id}>
                    {ref.title} ({ref.platform}) - {ref.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="lg" className="w-full">
              <Target className="h-4 w-4 mr-2" />
              Extract Shared DNA
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}