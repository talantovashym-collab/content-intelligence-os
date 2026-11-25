'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { Sidebar } from './sidebar';
import { cn } from '@/lib/utils';
import { RequireAuth } from '@/lib/auth';
import { ProjectProvider, useProjects } from '@/lib/project-context';
import { systemApi } from '@/lib/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <RequireAuth>
      <ProjectProvider>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <main className={cn('md:ml-64 min-h-screen', 'transition-all duration-200')}>
            <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-4">
                  <h1 className="text-xl font-semibold">Content Intelligence OS</h1>
                </div>
                <ProjectSwitcher />
              </div>
            </header>
            <div className="container p-4 md:p-6">
              <NoKeyBanner />
              {children}
            </div>
          </main>
        </div>
      </ProjectProvider>
    </RequireAuth>
  );
}

function ProjectSwitcher() {
  const { projects, current, setCurrentId, isLoading } = useProjects();

  if (isLoading) return null;
  if (projects.length === 0) {
    return (
      <Link href="/dashboard#projects" className="hidden sm:block text-sm font-medium text-primary hover:underline">
        Create your first project
      </Link>
    );
  }

  return (
    <label className="hidden sm:flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">PROJECT</span>
      <select
        className="max-w-[16rem] truncate bg-transparent border-none outline-none text-sm"
        value={current?.id ?? ''}
        onChange={(e) => setCurrentId(e.target.value)}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    </label>
  );
}


/** Every user brings their own AI key; until they add one, say so on every page but Settings. */
function NoKeyBanner() {
  const pathname = usePathname();
  const status = useQuery({ queryKey: ['system', 'ai'], queryFn: systemApi.ai, staleTime: 60_000 });
  if (pathname.startsWith('/settings') || !status.data || status.data.active_provider) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <KeyRound className="h-4 w-4 shrink-0" />
      <p className="flex-1">
        <span className="font-medium">Add your own AI key to turn on analysis.</span> Each account uses its own
        OpenAI, Anthropic, Gemini, Groq or other provider key. Until then, results are templates.
      </p>
      <Link href="/settings#ai-keys" className="rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-amber-50 hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950">
        Add a key
      </Link>
    </div>
  );
}
