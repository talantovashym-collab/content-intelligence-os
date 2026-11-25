'use client';

import React, { useState } from 'react';
import { ModuleTemplate } from '@/components/layout/module-template';
import { Upload, Search, Filter, MoreHorizontal, Download, Eye, Trash2, Grid, List } from 'lucide-react';
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
  tags: string[];
  status: 'pending' | 'downloading' | 'downloaded' | 'indexed' | 'analyzed' | 'archived';
  createdAt: string;
}

export default function LibraryPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const mockReferences = [
    { id: '1', title: 'How I Built a $10K/Month Side Hustle', platform: 'YouTube', creator: 'Entrepreneur Daily', views: 245000, duration: '12:34', tags: ['business', 'side-hustle'], status: 'analyzed', createdAt: '2024-01-15' },
    { id: '2', title: 'The Psychology of Viral Content', platform: 'TikTok', creator: 'Social Science', views: 89000, duration: '8:15', tags: ['psychology', 'viral'], status: 'analyzed', createdAt: '2024-01-10' },
    { id: '3', title: 'Building Systems, Not Goals', platform: 'YouTube', creator: 'Productivity Pro', views: 156000, duration: '15:22', tags: ['productivity', 'systems'], status: 'indexed', createdAt: '2024-01-05' },
    { id: '4', title: 'Micro-Habits That Changed My Life', platform: 'TikTok', creator: 'Habit Coach', views: 43000, duration: '0:58', tags: ['habits', 'productivity'], status: 'analyzed', createdAt: '2024-01-01' },
    { id: '5', title: 'AI Tools for Content Creators 2024', platform: 'YouTube', creator: 'Tech Reviewer', views: 67000, duration: '22:15', tags: ['ai', 'tools', 'content-creation'], status: 'indexed', createdAt: '2024-01-20' },
    { id: '6', title: 'Building a Personal Brand from Zero', platform: 'Instagram', creator: 'Brand Strategist', views: 78000, duration: '18:45', tags: ['personal-brand', 'instagram', 'growth'], status: 'downloaded', createdAt: '2024-01-18' },
  ];

  const filteredRefs = mockReferences.filter(ref => {
    if (platformFilter && ref.platform?.toLowerCase() !== platformFilter.toLowerCase()) return false;
    return true;
  });

  const statusColors: Record<string, string> = {
    analyzed: 'bg-green-100 text-green-800',
    indexed: 'bg-blue-100 text-blue-800',
    downloaded: 'bg-purple-100 text-purple-800',
    pending: 'bg-yellow-100 text-yellow-800',
    downloading: 'bg-orange-100 text-orange-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reference Library</h1>
          <p className="text-muted-foreground mt-1">Your organized collection of reference videos</p>
        </div>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search your library..."
                className="flex-1"
                value=""
                onChange={(e) => {}}
              />
              <Button variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            <div className="flex gap-2">
              <Select value="" onValueChange={(v) => {}}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Platforms</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
              <Select value="" onValueChange={(v) => {}}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="analyzed">Analyzed</SelectItem>
                  <SelectItem value="indexed">Indexed</SelectItem>
                  <SelectItem value="downloaded">Downloaded</SelectItem>
                </SelectContent>
              </Select>
              <Select value="newest" onValueChange={(v) => {}}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue>Newest First</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="views">Most Views</SelectItem>
                  <SelectItem value="duration">Longest Duration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Grid className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* References Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[
          { id: '1', title: 'How I Built a $10K/Month Side Hustle', platform: 'YouTube', creator: 'Entrepreneur Daily', views: 245000, duration: '12:34', tags: ['business', 'side-hustle'], status: 'analyzed' },
          { id: '2', title: 'The Psychology of Viral Content', platform: 'TikTok', creator: 'Social Science', views: 89000, duration: '8:15', tags: ['psychology', 'viral'], status: 'analyzed' },
          { id: '3', title: 'Building Systems, Not Goals', platform: 'YouTube', creator: 'Productivity Pro', views: 156000, duration: '15:22', tags: ['productivity', 'systems'], status: 'indexed' },
          { id: '4', title: 'Micro-Habits That Changed My Life', platform: 'TikTok', creator: 'Habit Coach', views: 43000, duration: '0:58', tags: ['habits', 'productivity'], status: 'analyzed' },
          { id: '5', title: 'AI Tools for Content Creators 2024', platform: 'YouTube', creator: 'Tech Reviewer', views: 67000, duration: '22:15', tags: ['ai', 'tools', 'content-creation'], status: 'indexed' },
          { id: '6', title: 'Building a Personal Brand from Zero', platform: 'Instagram', creator: 'Brand Strategist', views: 78000, duration: '18:45', tags: ['personal-brand', 'instagram', 'growth'], status: 'downloaded' },
        ].map((ref) => (
          <Card key={ref.id} className="group hover:shadow-lg transition-shadow">
            <div className="aspect-video bg-muted rounded-t-lg relative">
              <div className="absolute top-2 right-2 flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
              </div>
            </div>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-muted rounded capitalize">{ref.platform}</span>
                <span className={cn('text-xs px-2 py-1 rounded capitalize', 'bg-green-100 text-green-800')}>
                  {ref.status}
                </span>
              </div>
              <h3 className="font-semibold line-clamp-2">{ref.title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{ref.views.toLocaleString()} views</span>
                <span>•</span>
                <span>{ref.duration}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {ref.tags.map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded">{tag}</span>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" className="flex-1">Open</Button>
                <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}