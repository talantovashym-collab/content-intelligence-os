'use client';

import { Settings } from 'lucide-react';
import { ModuleTemplate } from '@/components/layout/module-template';

export default function SettingsPage() {
  return (
    <ModuleTemplate
      title="Settings"
      description="Account, workspace and integration preferences"
      icon={<Settings className="h-6 w-6 text-white" />}
      color="from-slate-500 to-gray-600"
      status="planned"
      features={[
        'Profile and account security',
        'AI provider configuration (OpenAI / Anthropic)',
        'Connected platform accounts for publishing',
        'Default formats, platforms and durations',
      ]}
    />
  );
}
