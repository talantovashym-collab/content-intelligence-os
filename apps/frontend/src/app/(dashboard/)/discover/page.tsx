'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Opportunity {
  id: string;
  title: string;
  topicDescription: string;
  targetAudience: string;
  audienceNeed: string;
  confidenceLevel: number;
  ranking: {
    marketInterest: number;
    trendMomentum: number;
    audienceRelevance: number;
    overallScore: number;
  };
  potentialHooks: string[];
  creativeFormats: string[];
  status: 'discovered' | 'researching' | 'validated' | 'rejected' | 'archived';
}

const mockOpportunities = [
  {
    id: '1',
    title: 'AI-Powered Personal Finance for Gen Z',
    topicDescription: 'Comprehensive coverage of AI-driven budgeting apps and investment tools targeting Gen Z and young millennials.',
    targetAudience: 'Gen Z (18-25) and young millennials (26-30) interested in personal finance',
    audienceNeed: 'Practical, actionable guidance on AI finance tools with real examples and comparisons',
    confidenceLevel: 0.87,
    ranking: { marketInterest: 0.92, trendMomentum: 0.89, audienceRelevance: 0.85, overallScore: 0.88 },
    potentialHooks: ['Why 90% of Gen Z fails at budgeting', 'The AI finance secret banks don\'t want you to know', 'I tried 10 AI budgeting apps - here\'s what actually works'],
    creativeFormats: ['educational', 'motion_graphics', 'whiteboard'],
    status: 'discovered',
  },
  {
    id: '2',
    title: 'Micro-Habit Stacking for Remote Workers',
    topicDescription: 'Science-backed micro-habits that compound into massive productivity gains for remote professionals.',
    targetAudience: 'Remote workers and digital nomads aged 25-40',
    audienceNeed: 'Actionable micro-habits that fit into chaotic remote work schedules',
    confidenceLevel: 0.82,
    ranking: { marketInterest: 0.78, trendMomentum: 0.82, audienceRelevance: 0.91, overallScore: 0.83 },
    potentialHooks: ['The 2-minute habit that 10x\'d my output', 'Why your morning routine is failing you', 'The 3 micro-habits top 1% performers do daily'],
    creativeFormats: ['educational', 'documentary', 'whiteboard'],
    status: 'researching',
  },
];

export default function DiscoverPage() {
  const [niche, setNiche] = useState('');
  const [audience, setAudience] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['youtube']);
  const [dateRange, setDateRange] = useState(30);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [opportunities] = useState(mockOpportunities);
  const [filters, setFilters] = useState({ status: '', format: '' });

  const handleDiscover = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discover Opportunities</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered trend research, gap detection, and opportunity ranking for your niche
          </p>
        </div>
        <Button onClick={handleDiscover} disabled={false} size="lg">
          <Zap className="h-4 w-4 mr-2" />
          Start Discovery
        </Button>
      </div>

      {/* Discovery Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Configure Discovery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-1">Niche/Topic</label>
              <Input
                placeholder="e.g., personal finance, productivity, tech/AI"
                value=""
                onChange={(e) => {}}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Audience</label>
              <Input
                placeholder="e.g., Gen Z, remote workers, small business owners"
                value=""
                onChange={(e) => {}}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Platforms</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date Range (days)</label>
              <Select>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="lg">
              <Zap className="h-4 w-4 mr-2" />
              Start AI Discovery
            </Button>
            <Button variant="outline" size="lg">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Discovered Opportunities</h2>
          <div className="flex gap-2">
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="discovered">Discovered</SelectItem>
                <SelectItem value="researching">Researching</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockOpportunities.map((opp) => (
            <Card key={opp.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{opp.title}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        {opp.status.charAt(0).toUpperCase() + opp.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{opp.topicDescription}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{Math.round(opp.ranking.overallScore * 100)}%</div>
                    <p className="text-xs text-muted-foreground">Overall Score</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Target Audience</p>
                    <p className="text-sm font-medium">{opp.targetAudience}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="text-sm font-medium">{Math.round(opp.confidenceLevel * 100)}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Potential Hooks</p>
                  <div className="flex flex-wrap gap-2">
                    {opp.potentialHooks.slice(0, 3).map((hook, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-muted rounded">{hook}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Creative Formats</p>
                  <div className="flex flex-wrap gap-2">
                    {opp.creativeFormats.map((fmt, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-muted rounded capitalize">{fmt.replace('_', ' ')}</span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-4 pt-2 border-t">
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-lg font-bold text-primary">{Math.round(opp.ranking.marketInterest * 100)}%</p>
                    <p className="text-xs text-muted-foreground">Market Interest</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-lg font-bold text-primary">{Math.round(opp.ranking.trendMomentum * 100)}%</p>
                    <p className="text-xs text-muted-foreground">Trend Momentum</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-lg font-bold text-primary">{Math.round(opp.ranking.audienceRelevance * 100)}%</p>
                    <p className="text-xs text-muted-foreground">Audience Relevance</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-lg font-bold text-primary">{Math.round(opp.ranking.overallScore * 100)}%</p>
                    <p className="text-xs text-muted-foreground">Overall</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1">Research</Button>
                  <Button size="sm" className="flex-1">Select</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}