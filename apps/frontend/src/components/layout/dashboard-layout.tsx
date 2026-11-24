'use client';

import React from 'react';
import { Sidebar } from './sidebar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={cn('md:ml-64 min-h-screen', 'transition-all duration-200')}>
        <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Content Intelligence OS</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">PROJECT</span>
                <select className="bg-transparent border-none outline-none text-sm">
                  <option>My Project</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>
        <div className="container p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}