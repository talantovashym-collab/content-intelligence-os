'use client';

import { BarChart } from 'lucide-react';
import { ModuleTemplate } from '@/components/layout/module-template';

export default function AnalyticsPage() {
  return (
    <ModuleTemplate
      title="Performance Analytics"
      description="Track how published content performs and feed the results back into strategy"
      icon={<BarChart className="h-6 w-6 text-white" />}
      color="from-emerald-500 to-teal-600"
      status="planned"
      features={[
        'Views, retention, CTR and engagement per publication',
        'Cross-platform comparison for the same production',
        'Test variant results from the Testing Lab',
        'Insights pushed to the Knowledge Base automatically',
      ]}
      ctaText="Open Testing Lab"
      ctaHref="/testing"
    />
  );
}
