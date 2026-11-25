'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineError } from '@/components/source-note';
import { referencesApi } from '@/lib/api';

/** Paste a video URL (YouTube, TikTok, ...) to add it to the project's reference library. */
export function CaptureForm({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const capture = useMutation({
    mutationFn: () => referencesApi.capture(projectId, url.trim()),
    onSuccess: () => {
      setUrl('');
      queryClient.invalidateQueries({ queryKey: ['references', projectId] });
      queryClient.invalidateQueries({ queryKey: ['research', projectId] });
    },
  });

  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); capture.mutate(); }}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} className="pl-9"
            placeholder="Paste a video URL (YouTube, TikTok, …)" aria-label="Video URL" />
        </div>
        <Button type="submit" disabled={capture.isPending || !url.trim()}>
          {capture.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add to library
        </Button>
      </div>
      <InlineError error={capture.error} />
      {capture.data && <p className="text-sm text-green-700">Added “{capture.data.title}”.</p>}
    </form>
  );
}
