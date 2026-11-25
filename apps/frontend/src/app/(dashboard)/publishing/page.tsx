'use client';

import { Globe } from 'lucide-react';
import { ModuleTemplate } from '@/components/layout/module-template';

export default function PublishingPage() {
  return (
    <ModuleTemplate
      title="Publishing Center"
      description="Schedule and publish finished productions across YouTube, TikTok, Instagram and LinkedIn"
      icon={<Globe className="h-6 w-6 text-white" />}
      color="from-sky-500 to-blue-600"
      status="planned"
      features={[
        'Multi-platform publishing from a single production',
        'Platform-specific titles, descriptions, tags and thumbnails',
        'Scheduling calendar with optimal posting windows',
        'Publication status tracking and retry on failure',
      ]}
      ctaText="Go to Production Studio"
      ctaHref="/production"
    />
  );
}
