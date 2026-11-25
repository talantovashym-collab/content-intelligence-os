'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, Loader2, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/page-header';
import { OpportunityCard } from '@/components/opportunity-card';
import { InlineError, SourceNote } from '@/components/source-note';
import { opportunitiesApi, type Project } from '@/lib/api';
import { ProjectGate } from '@/lib/project-context';

export default function IdeasPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Lightbulb} color="from-amber-500 to-orange-500" title="My Ideas"
        description="Check your own video ideas against what already exists, and get sharper angles" />
      <ProjectGate>{(project) => <IdeasWorkspace key={project.id} project={project} />}</ProjectGate>
    </div>
  );
}

function IdeasWorkspace({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const [concept, setConcept] = useState('');
  const [audience, setAudience] = useState(project.target_audience ?? '');

  const ideas = useQuery({
    queryKey: ['opportunities', project.id, 'idea'],
    queryFn: () => opportunitiesApi.list(project.id, 'idea'),
  });
  const validate = useMutation({
    mutationFn: () => opportunitiesApi.validateIdea(project.id, concept.trim(), audience.trim()),
    onSuccess: () => {
      setConcept('');
      queryClient.invalidateQueries({ queryKey: ['opportunities', project.id] });
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Validate an idea</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); validate.mutate(); }}>
            <div>
              <label htmlFor="concept" className="mb-1.5 block text-sm font-medium">Your idea</label>
              <Textarea id="concept" required minLength={5} maxLength={1000} value={concept}
                onChange={(e) => setConcept(e.target.value)} className="min-h-[80px]"
                placeholder="e.g., Cooking a full week of meals for 20 dollars" />
            </div>
            <div>
              <label htmlFor="audience" className="mb-1.5 block text-sm font-medium">Audience</label>
              <Input id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} />
            </div>
            <InlineError error={validate.error} />
            <Button type="submit" size="lg" className="w-full" disabled={validate.isPending || concept.trim().length < 5}>
              {validate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              {validate.isPending ? 'Checking YouTube…' : 'Validate idea'}
            </Button>
            {validate.data && (
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                Compared against {validate.data.videos_analyzed} existing videos. The result is at the top of the list below.
                <div className="mt-1.5">
                  <SourceNote source={validate.data.used_ai ? 'ai' : 'template'} warnings={validate.data.warnings} />
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Your ideas
            {ideas.data && <span className="ml-2 text-base font-normal text-muted-foreground">({ideas.data.total})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ideas.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          <InlineError error={ideas.error} />
          {ideas.data?.opportunities.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">No ideas yet.</p>
          )}
          {ideas.data?.opportunities.map((o) => <OpportunityCard key={o.id} projectId={project.id} opportunity={o} />)}
        </CardContent>
      </Card>
    </>
  );
}
