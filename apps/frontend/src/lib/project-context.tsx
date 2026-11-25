'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi, type Project } from '@/lib/api';

const PROJECT_KEY = 'ci_project';

interface ProjectContextValue {
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
  current: Project | null;
  setCurrentId: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

/** Loads the user's projects and remembers which one is selected (per browser). */
export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
  const projects = data?.projects ?? [];
  const [currentId, setCurrentIdState] = useState<string | null>(null);

  useEffect(() => {
    setCurrentIdState(window.localStorage.getItem(PROJECT_KEY));
  }, []);

  const setCurrentId = (id: string) => {
    window.localStorage.setItem(PROJECT_KEY, id);
    setCurrentIdState(id);
  };

  // Fall back to the newest project when nothing (or a deleted project) is selected
  const current = projects.find((p) => p.id === currentId) ?? projects[0] ?? null;

  return (
    <ProjectContext.Provider value={{ projects, isLoading, error: error as Error | null, current, setCurrentId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects must be used inside <ProjectProvider>');
  return ctx;
}

/** Shown by project-scoped pages while projects load, or when the user has none yet. */
export function ProjectGate({ children }: { children: (project: Project) => React.ReactNode }) {
  const { current, isLoading, error } = useProjects();
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (error) return <p className="text-sm text-destructive">Could not load projects: {error.message}</p>;
  if (!current) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="font-medium">You don't have a project yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Everything you create is saved inside a project.</p>
        <Link href="/dashboard#projects" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Create a project on the dashboard
        </Link>
      </div>
    );
  }
  return <>{children(current)}</>;
}
