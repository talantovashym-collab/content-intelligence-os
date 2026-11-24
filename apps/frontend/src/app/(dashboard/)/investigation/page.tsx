'use client';

import React from 'react';
import { ModuleTemplate } from '@/components/layout/module-template';
import { Brain, Video, Search, Zap, Loader2, Eye, Mic, Music, Scissors, Layers, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface AnalysisType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  status: 'ready' | 'planned';
}

const analysisTypes = [
  { id: 'frame', name: 'Frame Extraction', description: 'Extract frames at configurable intervals with timestamps', icon: <Layers className="h-5 w-5" />, color: 'from-blue-500 to-cyan-500', status: 'ready' },
  { id: 'scene', name: 'Scene Detection', description: 'Detect scene changes and transitions automatically', icon: <Scissors className="h-5 w-5" />, color: 'from-purple-500 to-pink-500', status: 'ready' },
  { id: 'ocr', name: 'OCR Text Extraction', description: 'Extract text from frames using Tesseract OCR', icon: <Target className="h-5 w-5" />, color: 'from-indigo-500 to-blue-500', status: 'ready' },
  { id: 'speech', name: 'Speech Transcription', description: 'Transcribe audio with Whisper (speaker diarization)', icon: <Mic className="h-5 w-5" />, color: 'from-green-500 to-emerald-500', status: 'ready' },
  { id: 'creative', name: 'Creative Analysis', description: 'Hooks, storytelling, emotions, narrative, animation, editing', icon: <Brain className="h-5 w-5" />, color: 'from-rose-500 to-red-500', status: 'ready' },
  { id: 'composition', name: 'Visual Composition', description: 'Camera angles, visual hierarchy, color, lighting analysis', icon: <Video className="h-5 w-5" />, color: 'from-amber-500 to-orange-500', status: 'planned' },
  { id: 'objects', name: 'Object/Character Detection', description: 'Detect objects, characters, expressions in frames', icon: <Eye className="h-5 w-5" />, color: 'from-teal-500 to-cyan-500', status: 'planned' },
  { id: 'audio', name: 'Music/SFX Analysis', description: 'Detect music, sound effects, rhythm patterns', icon: <Music className="h-5 w-5" />, color: 'from-purple-500 to-indigo-500', status: 'planned' },
]

export default function InvestigationPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investigation Studio</h1>
          <p className="text-muted-foreground mt-1">
            Deep frame-by-frame, audio, text, and creative technique analysis for your references
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Zap className="h-4 w-4 mr-2" />
          Batch Analyze
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {analysisTypes.map((analysis) => (
          <Card key={analysis.id} className={cn('group hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer', analysis.status === 'planned' && 'opacity-60')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', `bg-gradient-to-br ${analysis.color}`)}>
                  {analysis.icon}
                </div>
                <span className={cn('text-xs px-2 py-1 rounded-full', analysis.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                  {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                </span>
              </div>
              <CardTitle className="text-lg">{analysis.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{analysis.description}</p>
              <Button variant={analysis.status === 'ready' ? 'default' : 'outline'} className="w-full" size="sm">
                {analysis.status === 'ready' ? 'Launch Analysis' : 'Coming Soon'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reference Selector + Analysis Config */}
      <Card className="mt-4">
        <CardHeader>
          <h2 className="text-xl font-bold">Run Analysis on Reference</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Select Reference</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a reference from your library" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">How I Built a $10K/Month Side Hustle (YouTube)</SelectItem>
                  <SelectItem value="2">The Psychology of Viral Content (TikTok)</SelectItem>
                  <SelectItem value="3">Building Systems, Not Goals (YouTube)</SelectItem>
                  <SelectItem value="4">Micro-Habits That Changed My Life (TikTok)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Analysis Types</label>
              <div className="space-y-2">
                {[
                  { id: 'frame', name: 'Frame Extraction', default: true },
                  { id: 'scene', name: 'Scene Detection', default: true },
                  { id: 'ocr', name: 'OCR Text Extraction', default: true },
                  { id: 'speech', name: 'Speech Transcription', default: true },
                  { id: 'creative', name: 'Creative Techniques', default: true },
                ].map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked={opt.default} className="rounded border-input" />
                    <span className="text-sm">{opt.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Frame Extraction Config</label>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input placeholder="Interval (seconds)" type="number" defaultValue="5" />
                <Input placeholder="Max Frames" type="number" defaultValue="300" />
                <Select>
                  <SelectTrigger><SelectValue>jpg</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jpg">JPG</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline">Cancel</Button>
            <Button size="lg">
              <Zap className="h-4 w-4 mr-2" />
              Start Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}