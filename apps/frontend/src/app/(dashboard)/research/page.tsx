'use client';

import React, { useState } from 'react';
import { ModuleTemplate } from '@/components/layout/module-template';
import { Video, Search, Upload, Zap, Loader2, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Reference {
  id: string;
  title: string;
  platform: string;
  creator: string;
  views: number;
  duration: string;
  thumbnail: string;
  status: 'pending' | 'downloading' | 'downloaded' | 'indexed' | 'analyzed';
}

const mockReferences = [
  { id: '1', title: 'How I Built a $10K/Month Side Hustle', platform: 'YouTube', creator: 'Entrepreneur Daily', views: 245000, duration: '12:34', thumbnail: '', status: 'indexed' },
  { id: '2', title: 'The Psychology of Viral Content', platform: 'TikTok', creator: 'Social Science', views: 89000, duration: '8:15', thumbnail: '', status: 'downloaded' },
  { id: '3', title: 'Building Systems, Not Goals', platform: 'YouTube', creator: 'Productivity Pro', views: 156000, duration: '15:22', thumbnail: '', status: 'indexed' },
  { id: '4', title: 'Micro-Habits That Changed My Life', platform: 'TikTok', creator: 'Habit Coach', views: 43000, duration: '0:58', thumbnail: '', status: 'analyzed' },
];

export default function ResearchPage() {
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [references] = useState(mockReferences);
  const [filters, setFilters] = useState({ platform: '', status: '' });

  const handleSearch = async () => {
    // Simulate API call
  };

  return (
    <ModuleTemplate
      title="Reference Research"
      description="Find and analyze real reference videos across platforms with AI-powered search and import"
      icon={
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      }
      color="from-purple-500 to-pink-500"
      status="ready"
      features={[
        "Search across YouTube, TikTok, Instagram, and more",
        "Filter by platform, views, duration, and engagement",
        "One-click import and auto-indexing",
        "Auto-generated thumbnails and metadata extraction",
        "Batch import and bulk analysis",
        "Reference library with tagging and organization",
      ]}
      ctaText="Start Researching"
      ctaHref="#search-form"
    >
      <div id="search-form" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Search & Import References</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Search Query</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search for videos, creators, topics..."
                    value=""
                    onChange={(e) => {}}
                  />
                  <Button size="lg">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Platform</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Platforms</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="lg">
              <Search className="h-4 w-4 mr-2" />
              Search & Import
            </Button>
          </CardContent>
        </Card>

        {/* Import from URL */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Import from URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Paste YouTube, TikTok, Instagram URL..."
                className="flex-1"
                value=""
                onChange={(e) => {}}
              />
              <Button size="lg">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Supports YouTube, TikTok, Instagram Reels, Facebook, Twitter/X URLs</p>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Found References (4)</h2>
            <div className="flex gap-2">
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Platforms</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { id: '1', title: 'How I Built a $10K/Month Side Hustle', platform: 'YouTube', creator: 'Entrepreneur Daily', views: 245000, duration: '12:34', status: 'indexed' },
              { id: '2', title: 'The Psychology of Viral Content', platform: 'TikTok', creator: 'Social Science', views: 89000, duration: '8:15', status: 'downloaded' },
              { id: '3', title: 'Building Systems, Not Goals', platform: 'YouTube', creator: 'Productivity Pro', views: 156000, duration: '15:22', status: 'indexed' },
              { id: '4', title: 'Micro-Habits That Changed My Life', platform: 'TikTok', creator: 'Habit Coach', views: 43000, duration: '0:58', status: 'analyzed' },
            ].map((ref) => (
              <Card key={ref.id} className="group hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-muted rounded-t-lg relative">
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">{ref.platform}</span>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 rounded">{ref.duration}</div>
                </div>
                <CardContent className="space-y-3">
                  <h3 className="font-semibold line-clamp-2">{ref.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{ref.creator}</span>
                    <span>•</span>
                    <span>{ref.views.toLocaleString()} views</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full capitalize">{ref.status}</span>
                    <Button variant="outline" size="sm">Analyze</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ModuleTemplate>
  );
}