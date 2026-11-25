'use client';

import React from 'react';
import { ModuleTemplate } from '@/components/layout/module-template';
import { Palette, Zap, Lightbulb, Target, BookOpen, Edit, Plus, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function StrategyPage() {
  return (
    <ModuleTemplate
      title="Creative Strategy"
      description="Generate original creative strategies from research, patterns, and multi-reference intelligence"
      icon={
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      }
      color="from-orange-500 to-amber-500"
      status="planned"
      features={[
        "AI-generated creative concepts from research + patterns",
        "Multiple alternative strategies with confidence scoring",
        "Hook direction and narrative formula generation",
        "Visual style and animation style recommendations",
        "Platform-specific adaptations (YouTube, TikTok, IG, etc.)",
        "Differentiation analysis vs. competing content",
        "Strategy approval workflow with versioning",
      ]}
      ctaText="Create Strategy"
      ctaHref="#strategy-form"
    >
      <div id="strategy-form" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create New Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Based on Opportunity / Research</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select opportunity or research..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">AI Personal Finance for Gen Z (Opportunity)</SelectItem>
                  <SelectItem value="2">Micro-Habit Stacking (Research)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Core Concept</label>
                <Textarea placeholder="One-sentence summary of the creative concept..." className="min-h-[80px]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Topic</label>
                <Input placeholder="e.g., AI Personal Finance for Gen Z" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Target Audience</label>
                <Textarea placeholder="Describe your target audience in detail..." className="min-h-[80px]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Creative Angle</label>
                <Textarea placeholder="What unique angle or perspective will you take?" className="min-h-[80px]" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Core Message</label>
                <Textarea placeholder="The single most important takeaway..." className="min-h-[80px]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Emotional Objective</label>
                <Textarea placeholder="What emotion do you want viewers to feel?" className="min-h-[80px]" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Hook Direction</label>
                <Textarea placeholder="How will you grab attention in the first 3 seconds?" className="min-h-[80px]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Narrative Formula</label>
                <Textarea placeholder="e.g., Problem → Agitation → Solution → Proof → CTA" className="min-h-[80px]" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Visual Style</label>
                <Input placeholder="e.g., Modern dynamic, clean, high contrast" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Animation Style</label>
                <Input placeholder="e.g., Snappy, smooth, kinetic typography" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration (seconds)</label>
              <Input type="number" placeholder="60" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Platform Adaptations</label>
                <div className="space-y-2">
                  {['YouTube', 'TikTok', 'Instagram Reels', 'Facebook', 'Twitter/X', 'LinkedIn'].map((platform) => (
                    <label key={platform} className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded border-input" />
                      <span className="text-sm">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Differentiation</label>
                <Textarea placeholder="How is this different from competing content?" className="min-h-[80px]" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Alternative Concepts</label>
                <Textarea placeholder="Briefly describe 2-3 alternative approaches..." className="min-h-[80px]" />
              </div>
            </div>

            <Button size="lg" className="w-full">
              <Zap className="h-4 w-4 mr-2" />
              Generate Strategy
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Generated Strategies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Strategies will appear here after generation. Each strategy includes concept, hooks, narrative,
              visual style, platform adaptations, and differentiation analysis.
            </p>
          </CardContent>
        </Card>
      </div>
    </ModuleTemplate>
  );
}