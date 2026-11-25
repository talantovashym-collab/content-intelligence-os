'use client';

import { BookOpen } from 'lucide-react';
import { ModuleTemplate } from '@/components/layout/module-template';

export default function KnowledgePage() {
  return (
    <ModuleTemplate
      title="Knowledge Base"
      description="Accumulated learnings from research, investigations and performance data"
      icon={<BookOpen className="h-6 w-6 text-white" />}
      color="from-amber-500 to-orange-600"
      status="planned"
      features={[
        'Searchable entries tagged by topic, format and platform',
        'Proven hook, narrative and visual patterns',
        'Automatic capture from investigations and analytics',
        'Used as context when generating creative strategies',
      ]}
      ctaText="Start an Investigation"
      ctaHref="/investigation"
    />
  );
}
