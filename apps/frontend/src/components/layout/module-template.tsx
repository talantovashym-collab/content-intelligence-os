'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleTemplateProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  status: 'ready' | 'planned' | 'in_progress';
  features?: string[];
  ctaText?: string;
  ctaHref?: string;
  children?: React.ReactNode;
}

export function ModuleTemplate({
  title,
  description,
  icon,
  color,
  status,
  features = [],
  ctaText,
  ctaHref,
  children,
}: ModuleTemplateProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', `bg-gradient-to-br ${color}`)}>
              {icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              <p className="text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs px-3 py-1 rounded-full font-medium',
              status === 'ready' && 'bg-green-100 text-green-800',
              status === 'in_progress' && 'bg-blue-100 text-blue-800',
              status === 'planned' && 'bg-yellow-100 text-yellow-800',
            )}>
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {children || (
              <div className="space-y-4">
                <p className="text-muted-foreground">{description}</p>
                {features.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Key Features</h3>
                    <ul className="space-y-1">
                      {features.map((feature, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {ctaText && ctaHref && (
          <div className="flex justify-end">
            <Button size="lg" asChild>
              <Link href={ctaHref}>
                <Zap className="h-4 w-4 mr-2" />
                {ctaText}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}