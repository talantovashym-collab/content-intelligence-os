'use client';

import React from 'react';
import Link from 'next/link';
import { Sidebar } from './sidebar';
import { cn } from '@/lib/utils';
import { RequireAuth } from '@/lib/auth';
import { ProjectProvider, useProjects } from '@/lib/project-context';

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
            <div className="container p-4 md:p-6">{children}</div>
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
