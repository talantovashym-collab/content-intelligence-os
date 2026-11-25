'use client';

import React, { useState } from 'react';
import { ModuleTemplate } from '@/components/layout/module-template';
import { Lightbulb, Zap, Search, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function IdeasPage() {
  const [idea, setIdea] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleResearch = async () => {
    if (!idea.trim()) return;
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setResults({
      marketInterest: 0.85,
      competitionLevel: 'medium',
      suggestedAngles: ['Problem-solution', 'Case study', 'Comparison'],
      recommendedFormats: ['educational', 'whiteboard', 'motion_graphics'],
    });
  };

  return (
    <ModuleTemplate
      title="My Ideas"
      description="Enter your concept and get market validation, reference recommendations, and strategy suggestions"
      icon={
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polygon points="22 7 22 16 12 16 12 7 22 7" />
        </svg>
      }
      color="from-amber-500 to-orange-500"
      status="ready"
      features={[
        "Enter any idea, topic, or rough concept",
        "AI-powered market validation and interest analysis",
        "Automatic reference video recommendations",
        "Competing format comparison and gap detection",
        "Alternative angle and format suggestions",
        "Opportunity assessment with confidence scoring",
      ]}
      ctaText="Research Your Idea"
      ctaHref="#research-form"
    >
      <div id="research-form" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Research Your Idea</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Your Idea / Concept</label>
              <Textarea
                placeholder="Enter any idea, topic, problem, theme, hook, or rough concept..."
                className="min-h-[120px]"
                value=""
                onChange={(e) => {}}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Target Audience (optional)</label>
                <Input placeholder="e.g., Gen Z, remote workers, small business owners" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Platform Focus</label>
                <Input placeholder="YouTube, TikTok, Instagram, etc." />
              </div>
            </div>

            <Button size="lg" className="w-full" onClick={() => {}}>
              <Zap className="h-4 w-4 mr-2" />
              Research This Idea
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Research Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Enter your idea above and click "Research This Idea" to get market validation,
              reference recommendations, and strategic suggestions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Example: "Micro-Habit Stacking for Remote Workers"</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Market Interest</p>
                <p className="text-3xl font-bold text-primary">85%</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Competition Level</p>
                <p className="text-3xl font-bold text-primary">Medium</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Opportunity Score</p>
                <p className="text-3xl font-bold text-primary">83/100</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Suggested Angles</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Problem-solution narrative</li>
                  <li>• Case study format</li>
                  <li>• Comparison with traditional habits</li>
                </ul>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Recommended Formats</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Educational deep-dive</li>
                  <li>• Whiteboard animation</li>
                  <li>• Motion graphics explainer</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Suggested Hooks</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• "The 2-minute habit that 10x'd my output"</li>
                <li>• "Why your morning routine is failing you"</li>
                <li>• "The 3 micro-habits top 1% performers do daily"</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleTemplate>
  );
}